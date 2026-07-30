import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import { queryPools, getPoolById, getSupportersByPool, getPoolsBySupporter, getPoolsByCreator, getEvents, getDb } from './db'
import type { PoolListQuery } from './types'

const app = express()
const PORT = parseInt(process.env.KINDPOOL_API_PORT ?? '3001', 10)

app.use(cors())
app.use(express.json())

// ─── API Key Authentication ─────────────────────────────────────
// WARNING: API keys are stored in-memory only. Restarting the server clears them.
// In production, use a database-backed store.
const API_KEYS = new Map<string, { name: string; tier: 'free' | 'pro'; rateLimit: number }>()

// Admin key must be set in production via KINDPOOL_ADMIN_KEY env var.
// If not set, a warning is logged and API key management endpoints are disabled.
const ADMIN_KEY = process.env.KINDPOOL_ADMIN_KEY
if (!ADMIN_KEY) {
  console.warn('⚠️  KINDPOOL_ADMIN_KEY not set. Admin endpoints (/api/v1/admin/*) will be disabled.')
}

const DEV_API_KEY = process.env.KINDPOOL_DEV_API_KEY
if (DEV_API_KEY) {
  API_KEYS.set(DEV_API_KEY, { name: 'default-dev', tier: 'free', rateLimit: 100 })
}

function generateApiKey(name: string, tier: 'free' | 'pro'): string {
  const key = `kp_${crypto.randomBytes(24).toString('hex')}`
  API_KEYS.set(key, { name, tier, rateLimit: tier === 'pro' ? 10000 : 100 })
  return key
}

// Rate limit by API key or IP
const keyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string | undefined
    if (apiKey && API_KEYS.has(apiKey)) return apiKey
    return req.ip ?? 'unknown'
  },
  handler: (_req, res) => { res.status(429).json({ error: 'Rate limit exceeded' }) },
})

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'] as string | undefined
  if (!apiKey) {
    // Allow unauthenticated access to public endpoints (GET /pools, /health)
    if (req.method === 'GET') return next()
    return res.status(401).json({ error: 'Missing X-API-Key header' })
  }
  const keyData = API_KEYS.get(apiKey)
  if (!keyData) return res.status(403).json({ error: 'Invalid API key' })
  ;(req as any).apiKeyData = keyData
  next()
}

// Admin middleware for key management
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin interface not configured. Set KINDPOOL_ADMIN_KEY.' })
  const key = req.headers['x-admin-key'] as string | undefined
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' })
  next()
}

// Apply middlewares
app.use(keyLimiter)
app.use(authMiddleware)

// ─── API Key Management (admin only) ────────────────────────────
app.post('/api/v1/admin/keys', adminAuth, (req, res) => {
  const { name, tier } = req.body as { name: string; tier?: 'free' | 'pro' }
  if (!name) { res.status(400).json({ error: 'Missing name' }); return }
  const key = generateApiKey(name, tier ?? 'free')
  res.json({ api_key: key, name, tier: tier ?? 'free' })
})

app.get('/api/v1/admin/keys', adminAuth, (_req, res) => {
  const keys = Array.from(API_KEYS.entries()).map(([key, data]) => ({ key: key.slice(0, 12) + '...', ...data }))
  res.json({ data: keys })
})

// ─── Webhook System ─────────────────────────────────────────────
interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
}

const webhooks: Map<string, Webhook> = new Map()

app.post('/api/v1/admin/webhooks', adminAuth, (req, res) => {
  const { url, events } = req.body as { url: string; events: string[] }
  if (!url || !events?.length) { res.status(400).json({ error: 'Missing url or events' }); return }
  const id = crypto.randomUUID()
  const secret = crypto.randomBytes(16).toString('hex')
  webhooks.set(id, { id, url, events, secret, active: true })
  res.json({ id, secret })
})

app.get('/api/v1/admin/webhooks', adminAuth, (_req, res) => {
  res.json({ data: Array.from(webhooks.values()).map((w) => ({ ...w, secret: w.secret.slice(0, 8) + '...' })) })
})

app.delete('/api/v1/admin/webhooks/:id', adminAuth, (req, res) => {
  webhooks.delete(req.params.id)
  res.json({ success: true })
})

// ─── Public API Endpoints ──────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.get('/api/v1/pools', (req, res) => {
  const query: PoolListQuery = {
    status: req.query.status as any,
    creator: req.query.creator as string,
    sort: req.query.sort as any,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  }
  const result = queryPools(query)
  res.json(result)
})

app.get('/api/v1/pools/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid pool ID' }); return }
  const pool = getPoolById(id)
  if (!pool) { res.status(404).json({ error: 'Pool not found' }); return }
  res.json(pool)
})

app.get('/api/v1/pools/:id/supporters', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid pool ID' }); return }
  const supporters = getSupportersByPool(id)
  res.json({ data: supporters })
})

app.get('/api/v1/pools/:id/events', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid pool ID' }); return }
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
  const events = getEvents(id, undefined, limit)
  res.json({ data: events })
})

app.get('/api/v1/supporters/:address/pools', (req, res) => {
  const pools = getPoolsBySupporter(req.params.address)
  res.json({ data: pools })
})

app.get('/api/v1/creators/:address/pools', (req, res) => {
  const pools = getPoolsByCreator(req.params.address)
  res.json({ data: pools })
})

app.get('/api/v1/events', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
  const eventType = req.query.type as string | undefined
  const events = getEvents(undefined, eventType, limit)
  res.json({ data: events })
})

// ─── Webhook Dispatch ──────────────────────────────────────────
export async function dispatchWebhooks(eventType: string, poolId: number, data: any) {
  const payload = JSON.stringify({ event_type: eventType, pool_id: poolId, data, timestamp: Date.now() })

  for (const [id, webhook] of webhooks) {
    if (!webhook.active) continue
    if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) continue

    const signature = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex')

    fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KindlePool-Signature': signature,
        'X-KindlePool-Event': eventType,
      },
      body: payload,
    }).catch((err) => {
      console.error(`Webhook ${id} (${webhook.url}) failed:`, err.message)
    })
  }
}

export { app, generateApiKey }

export function startApi() {
  app.listen(PORT, () => {
    console.log(`KindlePool API running on http://localhost:${PORT}`)
    if (ADMIN_KEY) console.log(`  Admin key: ${ADMIN_KEY.slice(0, 12)}...`)
    else console.log('  Admin key: NOT CONFIGURED — set KINDPOOL_ADMIN_KEY')
    if (DEV_API_KEY) console.log('  Dev API key configured')
  })
}
