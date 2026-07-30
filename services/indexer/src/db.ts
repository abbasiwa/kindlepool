import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type { PoolRow, SupporterRow, EventRow, PoolListQuery, PaginatedResponse, PoolStatus } from './types'

const DB_PATH = process.env.KINDPOOL_DB_PATH ?? path.join(__dirname, '..', 'data', 'kindlepool.db')

let db: Database.Database

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getDb(): Database.Database {
  if (!db) {
    ensureDir(DB_PATH)
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate()
  }
  return db
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id TEXT NOT NULL,
      creator TEXT NOT NULL,
      token TEXT NOT NULL,
      goal TEXT NOT NULL,
      total_deposited TEXT NOT NULL DEFAULT '0',
      deadline INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      work_hash TEXT,
      vote_deadline INTEGER,
      yes_votes TEXT NOT NULL DEFAULT '0',
      no_votes TEXT NOT NULL DEFAULT '0',
      metadata_hash TEXT NOT NULL,
      total_supporters INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supporters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL REFERENCES pools(id),
      address TEXT NOT NULL,
      amount TEXT NOT NULL DEFAULT '0',
      voted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(pool_id, address)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL REFERENCES pools(id),
      event_type TEXT NOT NULL,
      data TEXT NOT NULL,
      ledger INTEGER NOT NULL,
      ts INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pools_status ON pools(status);
    CREATE INDEX IF NOT EXISTS idx_pools_creator ON pools(creator);
    CREATE INDEX IF NOT EXISTS idx_pools_deadline ON pools(deadline);
    CREATE INDEX IF NOT EXISTS idx_supporters_pool ON supporters(pool_id);
    CREATE INDEX IF NOT EXISTS idx_supporters_address ON supporters(address);
    CREATE INDEX IF NOT EXISTS idx_events_pool ON events(pool_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
  `)
}

export function upsertPool(pool: {
  contract_id: string
  id: number
  creator: string
  token: string
  goal: string
  total_deposited?: string
  deadline?: number
  status?: PoolStatus
  work_hash?: string | null
  vote_deadline?: number | null
  yes_votes?: string
  no_votes?: string
  metadata_hash?: string
  total_supporters?: number
}) {
  const existing = db.prepare('SELECT id FROM pools WHERE contract_id = ? AND id = ?').get(pool.contract_id, pool.id) as { id: number } | undefined

  if (existing) {
    db.prepare(`
      UPDATE pools SET
        total_deposited = ?, status = ?, work_hash = ?, vote_deadline = ?,
        yes_votes = ?, no_votes = ?, total_supporters = ?, updated_at = ?
      WHERE id = ?
    `).run(
      pool.total_deposited, pool.status, pool.work_hash, pool.vote_deadline,
      pool.yes_votes, pool.no_votes, pool.total_supporters, Date.now(),
      existing.id
    )
  } else {
    db.prepare(`
      INSERT INTO pools (contract_id, creator, token, goal, total_deposited, deadline, status,
        work_hash, vote_deadline, yes_votes, no_votes, metadata_hash, total_supporters, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pool.contract_id, pool.creator, pool.token, pool.goal, pool.total_deposited,
      pool.deadline, pool.status, pool.work_hash, pool.vote_deadline,
      pool.yes_votes, pool.no_votes, pool.metadata_hash, pool.total_supporters,
      Date.now(), Date.now()
    )
  }
}

export function upsertSupporter(poolId: number, address: string, amount: string, voted: boolean) {
  const existing = db.prepare('SELECT id FROM supporters WHERE pool_id = ? AND address = ?').get(poolId, address) as { id: number } | undefined

  if (existing) {
    db.prepare('UPDATE supporters SET amount = ?, voted = ? WHERE id = ?').run(amount, voted ? 1 : 0, existing.id)
  } else {
    db.prepare('INSERT INTO supporters (pool_id, address, amount, voted, created_at) VALUES (?, ?, ?, ?, ?)').run(poolId, address, amount, voted ? 1 : 0, Date.now())
  }
}

export function insertEvent(poolId: number, eventType: string, data: string, ledger: number, ts: number) {
  db.prepare('INSERT INTO events (pool_id, event_type, data, ledger, ts, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(poolId, eventType, data, ledger, ts, Date.now())
}

export function queryPools(q: PoolListQuery): PaginatedResponse<PoolRow> {
  const page = q.page ?? 1
  const limit = Math.min(q.limit ?? 20, 100)
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  if (q.status) {
    conditions.push('status = ?')
    params.push(q.status)
  }
  if (q.creator) {
    conditions.push('creator = ?')
    params.push(q.creator)
  }

  let orderBy = 'created_at DESC'
  if (q.sort === 'ending_soon') orderBy = 'deadline ASC'
  else if (q.sort === 'most_funded') orderBy = 'CAST(total_deposited AS INTEGER) DESC'

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const total = (db.prepare(`SELECT COUNT(*) as count FROM pools ${where}`).get(...params) as { count: number }).count
  const data = db.prepare(`SELECT * FROM pools ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset) as PoolRow[]

  return {
    data,
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  }
}

export function getPoolById(poolId: number): PoolRow | undefined {
  return db.prepare('SELECT * FROM pools WHERE id = ?').get(poolId) as PoolRow | undefined
}

export function getSupportersByPool(poolId: number): SupporterRow[] {
  return db.prepare('SELECT * FROM supporters WHERE pool_id = ? ORDER BY CAST(amount AS INTEGER) DESC').all(poolId) as SupporterRow[]
}

export function getPoolsBySupporter(address: string): PoolRow[] {
  return db.prepare(`
    SELECT p.* FROM pools p
    INNER JOIN supporters s ON s.pool_id = p.id
    WHERE s.address = ?
    ORDER BY p.updated_at DESC
  `).all(address) as PoolRow[]
}

export function getPoolsByCreator(address: string): PoolRow[] {
  return db.prepare('SELECT * FROM pools WHERE creator = ? ORDER BY created_at DESC').all(address) as PoolRow[]
}

export function getEvents(poolId?: number, eventType?: string, limit = 50): EventRow[] {
  const conditions: string[] = []
  const params: any[] = []
  if (poolId) { conditions.push('pool_id = ?'); params.push(poolId) }
  if (eventType) { conditions.push('event_type = ?'); params.push(eventType) }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return db.prepare(`SELECT * FROM events ${where} ORDER BY ts DESC LIMIT ?`).all(...params, limit) as EventRow[]
}

if (require.main === module) {
  getDb()
  console.log('Database migrated at:', DB_PATH)
}
