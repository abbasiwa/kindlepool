import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, Tabs, ProgressBar, Badge } from '../components/ui'
import { useWallet } from '../lib/wallet'
import { MOCK_POOLS } from '../lib/mock-data'

const tabs = [
  { id: 'created', label: 'Created' },
  { id: 'funded', label: 'Funded' },
  { id: 'history', label: 'History' },
]

export function Dashboard() {
  const { connected } = useWallet()
  const [activeTab, setActiveTab] = useState('created')

  const created = MOCK_POOLS.filter(() => false)
  const funded = MOCK_POOLS.slice(0, 2)
  const history = MOCK_POOLS.filter((p) => p.status === 'paid' || p.status === 'expired')

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-100">Connect your wallet to view your dashboard.</p>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center !p-4">
          <div className="text-2xl font-bold text-warm-300">{created.length}</div>
          <div className="text-sm text-muted-100">Created</div>
        </Card>
        <Card className="text-center !p-4">
          <div className="text-2xl font-bold text-warm-300">{funded.length}</div>
          <div className="text-sm text-muted-100">Funded</div>
        </Card>
        <Card className="text-center !p-4">
          <div className="text-2xl font-bold text-warm-300">—</div>
          <div className="text-sm text-muted-100">Success Rate</div>
        </Card>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'created' && (
        <div className="space-y-4">
          {created.length === 0 ? (
            <p className="text-center text-muted-100 py-8">No pools created yet.</p>
          ) : (
            created.map((pool) => (
              <Link key={pool.id} to={`/pool/${pool.id}`}>
                <Card hover className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold">{pool.title}</h3>
                      <p className="text-sm text-muted-100">{pool.supporters.length} supporters</p>
                    </div>
                    <Badge>{pool.status}</Badge>
                  </div>
                  <ProgressBar value={pool.raised} max={pool.goal} />
                  <div className="text-sm text-muted-100">{pool.raised} / {pool.goal} USDC</div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'funded' && (
        <div className="space-y-4">
          {funded.length === 0 ? (
            <p className="text-center text-muted-100 py-8">No pools funded yet.</p>
          ) : (
            funded.map((pool) => (
              <Link key={pool.id} to={`/pool/${pool.id}`}>
                <Card hover className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold">{pool.title}</h3>
                      <p className="text-sm text-muted-100">{pool.creator}</p>
                    </div>
                    <Badge variant={pool.status === 'open' ? 'default' : 'warning'}>{pool.status}</Badge>
                  </div>
                  <ProgressBar value={pool.raised} max={pool.goal} />
                  <div className="text-sm text-muted-100">Contributed: {pool.supporters[0]?.amount ?? 0} USDC</div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-muted-100 py-8">No completed pools yet.</p>
          ) : (
            history.map((pool) => (
              <Link key={pool.id} to={`/pool/${pool.id}`}>
                <Card hover className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold">{pool.title}</h3>
                      <p className="text-sm text-muted-100">{pool.creator}</p>
                    </div>
                    <Badge variant={pool.status === 'paid' ? 'success' : 'error'}>{pool.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-100">{pool.raised} USDC · {pool.supporters.length} supporters</div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </motion.div>
  )
}
