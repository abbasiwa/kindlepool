import { SorobanRpc } from '@stellar/stellar-sdk'
import fs from 'fs'
import path from 'path'

const CONFIG = {
  rpcUrl: process.env.KINDPOOL_MONITOR_RPC ?? 'https://soroban-testnet.stellar.org',
  indexerUrl: process.env.KINDPOOL_INDEXER_URL ?? 'http://localhost:3001',
  contractId: process.env.KINDPOOL_CONTRACT_ID ?? '',
  checkInterval: parseInt(process.env.KINDPOOL_MONITOR_INTERVAL ?? '300000', 10),
  anomalyThreshold: parseInt(process.env.KINDPOOL_ANOMALY_THRESHOLD ?? '10', 10),
  alertWebhook: process.env.KINDPOOL_ALERT_WEBHOOK ?? '',
  dataDir: process.env.KINDPOOL_MONITOR_DATA ?? './data',
}

interface HealthRecord {
  timestamp: number
  ledger: number
  indexerStatus: string
  poolCount: number
  status: 'ok' | 'degraded' | 'down'
  latency: number
  error?: string
}

interface AnomalyEvent {
  timestamp: number
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  data: Record<string, any>
}

const history: HealthRecord[] = []
const anomalies: AnomalyEvent[] = []
let lastPoolCount = 0

function ensureDataDir() {
  if (!fs.existsSync(CONFIG.dataDir)) fs.mkdirSync(CONFIG.dataDir, { recursive: true })
}

function saveJSON(filename: string, data: any) {
  fs.writeFileSync(path.join(CONFIG.dataDir, filename), JSON.stringify(data, null, 2))
}

function sendAlert(anomaly: AnomalyEvent) {
  anomalies.push(anomaly)
  console.log(`[ANOMALY][${anomaly.severity}] ${anomaly.message}`)
  if (anomaly.severity === 'critical' && CONFIG.alertWebhook) {
    fetch(CONFIG.alertWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `🚨 *KindlePool Alert*\nSeverity: ${anomaly.severity}\nType: ${anomaly.type}\nMessage: ${anomaly.message}` }),
    }).catch(() => {})
  }
}

async function runCheck() {
  const start = Date.now()
  const record: HealthRecord = {
    timestamp: start, ledger: 0, indexerStatus: 'unknown',
    poolCount: 0, status: 'ok', latency: 0,
  }

  try {
    // Check Stellar RPC
    const server = new SorobanRpc.Server(CONFIG.rpcUrl)
    const latest = await server.getLatestLedger()
    record.ledger = latest.sequence

    // Check indexer
    try {
      const idxRes = await fetch(`${CONFIG.indexerUrl}/api/v1/health`)
      const idxData: any = await idxRes.json()
      record.indexerStatus = idxData.status
    } catch {
      record.indexerStatus = 'unreachable'
      record.status = 'degraded'
    }

    // Get pool count from indexer
    try {
      const poolsRes = await fetch(`${CONFIG.indexerUrl}/api/v1/pools?limit=1`)
      const poolsData: any = await poolsRes.json()
      record.poolCount = poolsData.total ?? 0
    } catch {}

    record.latency = Date.now() - start
  } catch (err: any) {
    record.status = 'down'
    record.error = err.message
  }

  // Detect anomalies
  if (record.status === 'down') {
    sendAlert({
      timestamp: start, type: 'rpc_down', severity: 'critical',
      message: `Stellar RPC unreachable: ${record.error}`,
      data: { error: record.error ?? '' },
    })
  } else if (record.indexerStatus === 'unreachable') {
    sendAlert({
      timestamp: start, type: 'indexer_down', severity: 'warning',
      message: 'Indexer API is unreachable',
      data: {},
    })
  }

  if (lastPoolCount > 0 && record.poolCount > lastPoolCount + CONFIG.anomalyThreshold) {
    sendAlert({
      timestamp: start, type: 'high_pool_creation', severity: 'warning',
      message: `${record.poolCount - lastPoolCount} new pools since last check`,
      data: { previous: lastPoolCount, current: record.poolCount },
    })
  }
  lastPoolCount = record.poolCount

  history.push(record)
  if (history.length > 10080) history.shift()
  saveJSON('health.json', history.slice(-100))
  saveJSON('anomalies.json', anomalies.slice(-50))

  const icon = record.status === 'ok' ? '✅' : record.status === 'degraded' ? '⚠️' : '❌'
  console.log(`[${new Date().toISOString()}] ${icon} RPC=${record.ledger} Indexer=${record.indexerStatus} Pools=${record.poolCount} ${record.latency}ms`)
}

function start() {
  ensureDataDir()
  console.log('KindlePool Monitor started')
  console.log(`  Indexer: ${CONFIG.indexerUrl}`)
  console.log(`  Interval: ${CONFIG.checkInterval / 1000}s`)
  runCheck()
  setInterval(runCheck, CONFIG.checkInterval)

  process.on('SIGINT', () => {
    saveJSON('health.json', history.slice(-100))
    saveJSON('anomalies.json', anomalies.slice(-50))
    process.exit(0)
  })
}

start()
