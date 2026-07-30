import { motion } from 'framer-motion'
import { Card, Badge, Tabs } from '../components/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Users, Award, ArrowUp, ArrowDown } from 'lucide-react'

const LEADERBOARD_DATA = [
  { rank: 1, creator: '@artbymaya', earned: 12800, pools: 12, supporters: 89, successRate: 92, change: 'up' as const },
  { rank: 2, creator: '@sonicbloom', earned: 9600, pools: 8, supporters: 64, successRate: 88, change: 'up' as const },
  { rank: 3, creator: '@stellarauthor', earned: 7200, pools: 6, supporters: 51, successRate: 83, change: 'down' as const },
  { rank: 4, creator: '@pixelwizard', earned: 5400, pools: 10, supporters: 43, successRate: 70, change: 'same' as const },
  { rank: 5, creator: '@wordsmith', earned: 4100, pools: 5, supporters: 38, successRate: 80, change: 'up' as const },
]

const tabs = [
  { id: 'earned', label: 'Top Earners' },
  { id: 'pools', label: 'Most Pools' },
  { id: 'supporters', label: 'Most Supporters' },
]

export function Leaderboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('earned')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all')

  const sorted = [...LEADERBOARD_DATA].sort((a, b) => {
    if (activeTab === 'earned') return b.earned - a.earned
    if (activeTab === 'pools') return b.pools - a.pools
    return b.supporters - a.supporters
  })

  const handleCardClick = (id: number) => {
    navigate(`/pool/${id}`)
  }

  const changeIcon = (change: 'up' | 'down' | 'same') => {
    if (change === 'up') return <ArrowUp size={14} className="text-success" />
    if (change === 'down') return <ArrowDown size={14} className="text-error" />
    return null
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="text-warm-300" size={28} />
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="text-muted-100 mt-1">Top creators on KindlePool</p>
          </div>
        </div>
        <div className="flex gap-1 bg-cream-200 rounded-xl p-1">
          {(['7d', '30d', 'all'] as const).map((r) => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                timeRange === r ? 'bg-surface text-text-light' : 'text-muted-100 hover:text-text-light'
              }`}>{r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}</button>
          ))}
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="space-y-3">
        {sorted.map((item, i) => (
          <motion.div key={item.creator} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card hover className="!p-4" onClick={() => handleCardClick(item.rank)}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  item.rank <= 3 ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 text-muted-200'
                }`}>{item.rank}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{item.creator}</span>
                    <Badge variant={item.successRate >= 85 ? 'success' : item.successRate >= 70 ? 'warning' : 'default'}>
                      {item.successRate}%
                    </Badge>
                    {changeIcon(item.change)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-100 mt-0.5">
                    <span className="flex items-center gap-1"><Award size={12} /> {item.pools} pools</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {item.supporters}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-warm-300">{item.earned.toLocaleString()} USDC</div>
                  <div className="text-xs text-muted-100">earned</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
