import { motion } from 'framer-motion'
import { Card, Tabs } from '../components/ui'
import { useState } from 'react'
import { useWallet } from '../lib/wallet'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, DollarSign, Users, Activity, Award } from 'lucide-react'

const weeklyVolume = [
  { week: 'W1', volume: 1200, pools: 5 },
  { week: 'W2', volume: 2400, pools: 8 },
  { week: 'W3', volume: 1800, pools: 6 },
  { week: 'W4', volume: 3200, pools: 11 },
  { week: 'W5', volume: 2800, pools: 9 },
  { week: 'W6', volume: 4100, pools: 14 },
]

const categoryBreakdown = [
  { name: 'Art', value: 38 },
  { name: 'Writing', value: 25 },
  { name: 'Music', value: 18 },
  { name: 'Code', value: 12 },
  { name: 'Other', value: 7 },
]

const COLORS = ['#C4956A', '#D4A574', '#E8D5C4', '#B8845A', '#A0704A']

const mockStats = [
  { label: 'Total Volume', value: '15,800 USDC', change: '+18%', icon: <DollarSign size={20} /> },
  { label: 'Active Pools', value: '23', change: '+5 this week', icon: <Activity size={20} /> },
  { label: 'Total Creators', value: '47', change: '+8 this month', icon: <Users size={20} /> },
  { label: 'Success Rate', value: '76%', change: '+3% vs last month', icon: <Award size={20} /> },
]

const tabs = [
  { id: 'volume', label: 'Volume' },
  { id: 'creators', label: 'Creators' },
  { id: 'categories', label: 'Categories' },
]

export function PlatformAnalytics() {
  const { connected } = useWallet()
  const [activeTab, setActiveTab] = useState('volume')

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Platform Analytics</h1>
        <p className="text-muted-100">Connect your wallet to view platform analytics.</p>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center gap-3">
        <TrendingUp className="text-warm-300" size={28} />
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-100 mt-1">KindlePool platform-wide metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mockStats.map((s) => (
          <Card key={s.label} className="!p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-100">{s.icon}</span>
              <span className="text-xs text-success font-medium">{s.change}</span>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-100">{s.label}</div>
          </Card>
        ))}
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'volume' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <h3 className="font-bold">Weekly Volume</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolume}>
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A7A6A' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A7A6A' }} />
                  <Tooltip />
                  <Bar dataKey="volume" fill="#C4956A" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-bold">Pools Created (Weekly)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyVolume}>
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A7A6A' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8A7A6A' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pools" stroke="#D4A574" strokeWidth={2} dot={{ fill: '#D4A574', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'creators' && (
        <Card className="space-y-4">
          <h3 className="font-bold">Creator Growth</h3>
          <p className="text-sm text-muted-100">Metrics will be available once data is indexed.</p>
        </Card>
      )}

      {activeTab === 'categories' && (
        <Card className="space-y-4">
          <h3 className="font-bold">Category Distribution</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categoryBreakdown.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-100">{d.name}</span>
                  <span className="font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  )
}
