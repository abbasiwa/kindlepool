import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { queryPools, getPoolById, getSupportersByPool, getPoolsBySupporter, getPoolsByCreator, getEvents } from './db'
import type { PoolListQuery, PaginatedResponse, PoolRow, SupporterRow, EventRow } from './types'

const app = express()
const PORT = parseInt(process.env.KINDPOOL_API_PORT ?? '3001', 10)

app.use(cors())
app.use(express.json())

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.KINDPOOL_RATE_LIMIT ?? '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
})

app.use('/api/', limiter)

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
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid pool ID' })
    return
  }
  const pool = getPoolById(id)
  if (!pool) {
    res.status(404).json({ error: 'Pool not found' })
    return
  }
  res.json(pool)
})

app.get('/api/v1/pools/:id/supporters', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid pool ID' })
    return
  }
  const supporters = getSupportersByPool(id)
  res.json({ data: supporters })
})

app.get('/api/v1/pools/:id/events', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid pool ID' })
    return
  }
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

export { app }

export function startApi() {
  app.listen(PORT, () => {
    console.log(`KindlePool API running on http://localhost:${PORT}`)
    console.log(`  Health:  http://localhost:${PORT}/api/v1/health`)
    console.log(`  Pools:   http://localhost:${PORT}/api/v1/pools`)
  })
}
