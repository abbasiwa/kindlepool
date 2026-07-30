import { SorobanRpc, Contract } from '@stellar/stellar-sdk'
import { getDb, upsertPool, upsertSupporter, insertEvent } from './db'

const RPC_URL = process.env.KINDPOOL_RPC_URL ?? 'https://soroban-testnet.stellar.org'
const CONTRACT_ID = process.env.KINDPOOL_CONTRACT_ID ?? ''
const POLL_INTERVAL = parseInt(process.env.KINDPOOL_POLL_INTERVAL ?? '10000', 10)

let isRunning = false
let lastLedger = 0

// Event topic keys from our contract (short symbols, max 9 chars)
const EVENT_KEYS: Record<string, string> = {
  p_creat: 'p_creat',
  p_dep: 'p_dep',
  p_goal: 'p_goal',
  p_work: 'p_work',
  p_vote: 'p_vote',
  p_paid: 'p_paid',
  p_ref: 'p_ref',
}

function handleEvent(raw: any) {
  try {
    const topics: string[] = (raw.topic ?? []).map((t: any) => {
      if (typeof t === 'string') return t
      if (t?.toString) return t.toString()
      return String(t)
    })

    const eventType = topics[0] ?? ''
    if (!EVENT_KEYS[eventType]) return

    const poolId = parseInt(topics[1] ?? '0', 10)
    if (isNaN(poolId) || poolId === 0) return

    const ledger = raw.ledger ?? 0
    const ts = raw.ledgerClosedAt ? new Date(raw.ledgerClosedAt).getTime() : Date.now()

    const t = (i: number) => topics[i] ?? ''

    switch (eventType) {
      case 'p_creat': {
        upsertPool({
          contract_id: CONTRACT_ID,
          id: poolId,
          creator: t(2),
          token: t(5),
          goal: t(3),
          deadline: parseInt(t(4) ?? '0'),
          metadata_hash: t(6) ?? '',
          status: 'open',
          total_deposited: '0',
          yes_votes: '0',
          no_votes: '0',
          total_supporters: 0,
        })
        break
      }
      case 'p_dep': {
        const supporter = t(2)
        const amount = t(3)
        upsertSupporter(poolId, supporter, amount, false)
        const db = getDb()
        const existing = db.prepare('SELECT * FROM pools WHERE contract_id = ? AND id = ?').get(CONTRACT_ID, poolId) as any
        if (existing) {
          const totalDeposited = existing.total_deposited ? (BigInt(existing.total_deposited) + BigInt(amount)).toString() : amount
          db.prepare('UPDATE pools SET total_deposited = ?, total_supporters = total_supporters + 1, updated_at = ? WHERE id = ?')
            .run(totalDeposited, Date.now(), existing.id)
        }
        break
      }
      case 'p_goal': {
        const db = getDb()
        const existing = db.prepare('SELECT * FROM pools WHERE contract_id = ? AND id = ?').get(CONTRACT_ID, poolId) as any
        if (existing) {
          db.prepare('UPDATE pools SET total_deposited = ?, updated_at = ? WHERE id = ?')
            .run(t(2) ?? existing.total_deposited, Date.now(), existing.id)
        }
        break
      }
      case 'p_work': {
        const db = getDb()
        const existing = db.prepare('SELECT * FROM pools WHERE contract_id = ? AND id = ?').get(CONTRACT_ID, poolId) as any
        if (existing) {
          db.prepare('UPDATE pools SET status = ?, work_hash = ?, vote_deadline = ?, updated_at = ? WHERE id = ?')
            .run('awaiting_vote', t(2), parseInt(t(3) ?? '0'), Date.now(), existing.id)
        }
        break
      }
      case 'p_vote': {
        const voter = t(2)
        const approve = t(3) === 'true'
        const weight = t(4) ?? '0'
        upsertSupporter(poolId, voter, weight, true)
        const db = getDb()
        const existing = db.prepare('SELECT * FROM pools WHERE contract_id = ? AND id = ?').get(CONTRACT_ID, poolId) as any
        if (existing) {
          const yesVotes = approve
            ? (BigInt(existing.yes_votes || '0') + BigInt(weight)).toString()
            : existing.yes_votes
          const noVotes = !approve
            ? (BigInt(existing.no_votes || '0') + BigInt(weight)).toString()
            : existing.no_votes
          db.prepare('UPDATE pools SET yes_votes = ?, no_votes = ?, updated_at = ? WHERE id = ?')
            .run(yesVotes, noVotes, Date.now(), existing.id)
        }
        break
      }
      case 'p_paid': {
        const db = getDb()
        db.prepare('UPDATE pools SET status = ?, updated_at = ? WHERE contract_id = ? AND id = ?')
          .run('paid', Date.now(), CONTRACT_ID, poolId)
        break
      }
      case 'p_ref': {
        const db = getDb()
        db.prepare('UPDATE pools SET status = ?, updated_at = ? WHERE contract_id = ? AND id = ?')
          .run('expired', Date.now(), CONTRACT_ID, poolId)
        break
      }
    }

    insertEvent(poolId, eventType, JSON.stringify({ topics }), ledger, ts)
    console.log(`[${new Date().toISOString()}] ${eventType} pool=#${poolId} ledger=${ledger}`)
  } catch (err) {
    console.error('Error handling event:', err)
  }
}

export async function pollEvents() {
  if (isRunning) return
  isRunning = true

  try {
    const server = new SorobanRpc.Server(RPC_URL)

    try {
      const latestLedger = await server.getLatestLedger()
      const currentLedger = latestLedger.sequence
      const startLedger = lastLedger > 0 ? lastLedger + 1 : currentLedger - 100

      if (startLedger >= currentLedger) {
        lastLedger = currentLedger
        isRunning = false
        return
      }

      const response = await server.getEvents({
        startLedger,
        filters: [{
          type: 'contract' as any,
          contractIds: [CONTRACT_ID],
        }],
        limit: 100,
      })

      const events = (response as any).events ?? []
      for (const event of events) {
        handleEvent(event)
      }

      lastLedger = currentLedger
      console.log(`[${new Date().toISOString()}] Polled ledgers ${startLedger}-${currentLedger}, ${events.length} events`)
    } catch (err) {
      console.error('Event fetch error:', err)
    }
  } catch (err) {
    console.error('Poll error:', err)
  }

  isRunning = false
}

export function startEventListener() {
  console.log(`Listening on contract ${CONTRACT_ID} @ ${RPC_URL}`)
  pollEvents()
  setInterval(pollEvents, POLL_INTERVAL)
}
