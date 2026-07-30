import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, ProgressBar, Badge, Tabs, Input } from '../components/ui'
import { Search } from 'lucide-react'

const MOCK_POOLS = [
  { id: 1, title: 'Digital Portrait Commission', creator: '@artbymaya', goal: 500, raised: 340, supporters: 12, deadline: 3, status: 'open', category: 'art' },
  { id: 2, title: 'Short Story Collection', creator: '@wordsmith', goal: 300, raised: 300, supporters: 8, deadline: 1, status: 'vote', category: 'writing' },
  { id: 3, title: 'Ambient Music EP', creator: '@sonicbloom', goal: 800, raised: 220, supporters: 6, deadline: 7, status: 'open', category: 'music' },
  { id: 4, title: 'Pixel Art Tileset', creator: '@pixelwizard', goal: 200, raised: 50, supporters: 3, deadline: 14, status: 'open', category: 'art' },
  { id: 5, title: 'Sci-Fi Novel Chapter', creator: '@stellarauthor', goal: 600, raised: 600, supporters: 15, deadline: 2, status: 'vote', category: 'writing' },
  { id: 6, title: 'Podcast Episode Script', creator: '@storyteller', goal: 150, raised: 90, supporters: 5, deadline: 5, status: 'open', category: 'writing' },
]

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'vote', label: 'Voting' },
  { id: 'paid', label: 'Funded' },
]

export function Explore() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = MOCK_POOLS
    .filter((p) => activeTab === 'all' || p.status === activeTab)
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.creator.toLowerCase().includes(search.toLowerCase()))

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((pool, i) => (
          <motion.div
            key={pool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/pool/${pool.id}`}>
              <Card hover className="space-y-4 h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{pool.title}</h3>
                    <p className="text-sm text-muted-100">{pool.creator}</p>
                  </div>
                  <Badge variant={pool.status === 'open' ? 'default' : pool.status === 'vote' ? 'warning' : 'success'}>
                    {pool.status}
                  </Badge>
                </div>
                <ProgressBar value={pool.raised} max={pool.goal} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-100">{pool.raised} / {pool.goal} USDC</span>
                  <span className="text-warm-300 font-medium">{pool.supporters}</span>
                </div>
                <div className="text-xs text-muted-100">{pool.deadline} days left</div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
