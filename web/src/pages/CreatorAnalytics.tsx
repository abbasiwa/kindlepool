import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, Badge, ProgressBar, Button } from '../components/ui'
import { useWallet } from '../lib/wallet'
import { useCreator } from '../lib/creator'
import { CreatorVerification } from '../components/CreatorVerification'
import { MilestoneTimeline, type Milestone } from '../components/MilestoneTimeline'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, DollarSign, Award, BadgeCheck, Plus } from 'lucide-react'

const earningsData = [
  { month: 'Jan', earned: 1200, pools: 3 },
  { month: 'Feb', earned: 800, pools: 2 },
  { month: 'Mar', earned: 2100, pools: 5 },
  { month: 'Apr', earned: 1500, pools: 4 },
  { month: 'May', earned: 2800, pools: 6 },
  { month: 'Jun', earned: 1900, pools: 4 },
]

const categoryData = [
  { name: 'Art', value: 45 },
  { name: 'Writing', value: 30 },
  { name: 'Music', value: 15 },
  { name: 'Code', value: 10 },
]

const COLORS = ['#C4956A', '#D4A574', '#E8D5C4', '#B8845A']

const milestones: Milestone[] = [
  { label: 'Sketch / Concept', percent: 30, completed: true, current: false },
  { label: 'Coloring / Refinement', percent: 30, completed: false, current: true },
  { label: 'Final Delivery', percent: 40, completed: false, current: false },
]

export function CreatorAnalytics() {
  const navigate = useNavigate()
  const { connected } = useWallet()
  const { profile } = useCreator()
  const [showVerification, setShowVerification] = useState(false)
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y'>('6m')

  if (!connected) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Creator Studio</h1>
        <p className="text-muted-100">Connect your wallet to access creator tools.</p>
      </div>
    )
  }

  const stats = [
    { label: 'Total Earned', value: `${profile?.totalEarned ?? 0} USDC`, icon: <DollarSign size={20} />, change: profile ? '+12%' : '—' },
    { label: 'Pools Created', value: String(profile?.totalPools ?? 0), icon: <TrendingUp size={20} />, change: profile ? '+3 this month' : '—' },
    { label: 'Total Supporters', value: '47', icon: <Users size={20} />, change: profile ? '+8 this month' : '—' },
    { label: 'Success Rate', value: profile ? `${profile.successRate}%` : '—', icon: <Award size={20} />, change: profile ? 'vs 85% avg' : '—' },
  ]

  const recentPools = [
    { id: 1, title: 'Digital Portrait', status: 'active', raised: 340, goal: 500, supporters: 12 },
    { id: 2, title: 'Pixel Art Tileset', status: 'draft', raised: 0, goal: 200, supporters: 0 },
  ]

  const filteredData = timeRange === '1m' ? earningsData.slice(-2) : timeRange === '3m' ? earningsData.slice(-4) : earningsData

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Studio</h1>
          <p className="text-muted-100 mt-1">Manage your pools and track performance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowVerification(true)}>
            {profile?.verified ? <><BadgeCheck size={16} className="text-success" /> Verified</> : <><BadgeCheck size={16} /> Get Verified</>}
          </Button>
          <Button size="sm" onClick={() => navigate('/create')}><Plus size={16} /> New Pool</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-100">{s.icon}</span>
              {profile && <span className="text-xs text-success font-medium">{s.change}</span>}
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-100">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Earnings Over Time</h3>
            <div className="flex gap-1">
              {(['1m', '3m', '6m', '1y'] as const).map((r) => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    timeRange === r ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 text-muted-100 hover:text-text-light'
                  }`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A7A6A' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A7A6A' }} />
                <Tooltip />
                <Line type="monotone" dataKey="earned" stroke="#C4956A" strokeWidth={2} dot={{ fill: '#C4956A', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="font-bold">Category Distribution</h3>
          <div className="h-48 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-100">{d.name}</span>
                  <span className="font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Active Milestone — Digital Portrait</h3>
          <span className="text-xs text-muted-100">500 USDC · 3 supporters</span>
        </div>
        <MilestoneTimeline milestones={milestones} totalAmount={500} />
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold">Your Pools</h3>
        {recentPools.map((pool) => (
          <Card key={pool.id} hover className="space-y-3 !p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{pool.title}</h4>
                <p className="text-xs text-muted-100">{pool.supporters} supporters</p>
              </div>
              <Badge variant={pool.status === 'active' ? 'success' : 'default'}>{pool.status}</Badge>
            </div>
            {pool.goal > 0 && <ProgressBar value={pool.raised} max={pool.goal} />}
            <div className="flex items-center justify-between text-xs text-muted-100">
              <span>{pool.raised} / {pool.goal} USDC</span>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/pool/${pool.id}`)}>Manage →</Button>
            </div>
          </Card>
        ))}
      </div>

      <CreatorVerification open={showVerification} onClose={() => setShowVerification(false)} />
    </motion.div>
  )
}
