import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, ProgressBar, Badge, Tabs, Input } from '../components/ui'
import { MOCK_POOLS } from '../lib/mock-data'
import { Search } from 'lucide-react'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'vote', label: 'Voting' },
  { id: 'paid', label: 'Funded' },
]

export function Explore() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return MOCK_POOLS
      .filter((p) => activeTab === 'all' || p.status === activeTab || (activeTab === 'paid' && p.status === 'paid'))
      .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.creator.toLowerCase().includes(search.toLowerCase()))
  }, [activeTab, search])

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <h1 className="text-3xl font-bold">Explore Pools</h1>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-100" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pools..."
              className="pl-9"
            />
          </div>
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-100">
          <p>No pools found.</p>
          <Link to="/create" className="text-warm-300 mt-2 inline-block hover:text-warm-400 transition-colors">
            Create one →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((pool, i) => {
            const badgeVariant = pool.status === 'open' ? 'default' : pool.status === 'vote' ? 'warning' : 'success'
            return (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link to={`/pool/${pool.id}`}>
                  <Card hover className="space-y-4 h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold">{pool.title}</h3>
                        <p className="text-sm text-muted-100">{pool.creator}</p>
                      </div>
                      <Badge variant={badgeVariant}>{pool.status}</Badge>
                    </div>
                    <ProgressBar value={pool.raised} max={pool.goal} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-100">{pool.raised} / {pool.goal} USDC</span>
                      <span className="text-warm-300 font-medium">{pool.supporters.length}</span>
                    </div>
                    <div className="text-xs text-muted-100">
                      {pool.deadline > 0 ? `${pool.deadline} days left` : 'Ending today'}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
