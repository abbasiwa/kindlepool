import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, Tabs, ProgressBar, Badge } from '../components/ui'
import { useWallet } from '../lib/wallet'

const MOCK_CREATED = [
  { id: 1, title: 'Digital Portrait Commission', raised: 340, goal: 500, status: 'open', supporters: 12 },
]

const MOCK_FUNDED = [
  { id: 5, title: 'Sci-Fi Novel Chapter', creator: '@stellarauthor', contributed: 100, status: 'vote' },
  { id: 3, title: 'Ambient Music EP', creator: '@sonicbloom', contributed: 50, status: 'open' },
]

const tabs = [
  { id: 'created', label: 'Created' },
  { id: 'funded', label: 'Funded' },
  { id: 'history', label: 'History' },
]

export function Dashboard() {
  const { connected } = useWallet()
  const [activeTab, setActiveTab] = useState('created')

  if (!connected) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-100">Connect your wallet to view your dashboard.</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Created', value: MOCK_CREATED.length },
          { label: 'Funded', value: MOCK_FUNDED.length },
          { label: 'Success Rate', value: '100%' },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <div className="text-2xl font-bold text-warm-300">{s.value}</div>
            <div className="text-sm text-muted-100">{s.label}</div>
          </Card>
        ))}
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'created' && (
        <div className="space-y-4">
          {MOCK_CREATED.length === 0 ? (
            <p className="text-center text-muted-100 py-8">No pools created yet.</p>
          ) : (
            MOCK_CREATED.map((pool) => (
              <Link key={pool.id} to={`/pool/${pool.id}`}>
                <Card hover className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold">{pool.title}</h3>
                      <p className="text-sm text-muted-100">{pool.supporters} supporters</p>
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
          {MOCK_FUNDED.length === 0 ? (
            <p className="text-center text-muted-100 py-8">No pools funded yet.</p>
          ) : (
            MOCK_FUNDED.map((pool) => (
              <Link key={pool.id} to={`/pool/${pool.id}`}>
                <Card hover className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold">{pool.title}</h3>
                      <p className="text-sm text-muted-100">{pool.creator}</p>
                    </div>
                    <Badge variant={pool.status === 'open' ? 'default' : 'warning'}>{pool.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-100">Contributed: {pool.contributed} USDC</div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </motion.div>
  )
}
