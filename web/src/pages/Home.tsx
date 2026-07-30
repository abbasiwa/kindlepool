import { motion } from 'framer-motion'
import { Card, Button, ProgressBar } from '../components/ui'
import { Sparkles, Users, Shield } from 'lucide-react'

const features = [
  {
    icon: <Sparkles size={24} />,
    title: 'Fund Specific Work',
    desc: 'Support a particular project, not a creator. Your money goes to the work you believe in.',
  },
  {
    icon: <Users size={24} />,
    title: 'Community Voted',
    desc: 'Supporters vote on quality. Funds release only if the work meets the community standard.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Automated Refunds',
    desc: 'If the goal isn\'t met or work is rejected, funds automatically return to supporters.',
  },
]

const featuredPools = [
  { id: 1, title: 'Digital Portrait Commission', creator: '@artbymaya', goal: 500, raised: 340, supporters: 12, deadline: '3 days' },
  { id: 2, title: 'Short Story Collection', creator: '@wordsmith', goal: 300, raised: 300, supporters: 8, deadline: '1 day' },
  { id: 3, title: 'Ambient Music EP', creator: '@sonicbloom', goal: 800, raised: 220, supporters: 6, deadline: '7 days' },
]

export function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-16 space-y-6"
      >
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-light leading-tight max-w-2xl mx-auto">
          Fund the <span className="text-warm-300">work</span>,<br />
          not the creator
        </h1>
        <p className="text-lg text-muted-100 max-w-xl mx-auto leading-relaxed">
          Micro-sponsor pools for creators. Money pools trustlessly on Stellar, 
          releases only if quality thresholds are met, and auto-refunds otherwise.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button size="lg">Explore Pools</Button>
          <Button size="lg" variant="secondary">Create a Pool</Button>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {features.map((f, i) => (
          <Card key={i} hover className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-warm-100/50 flex items-center justify-center mx-auto text-warm-300">
              {f.icon}
            </div>
            <h3 className="font-bold text-lg">{f.title}</h3>
            <p className="text-sm text-muted-100 leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </motion.section>

      {/* Featured Pools */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Trending Pools</h2>
          <Button variant="ghost" size="sm">View all →</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {featuredPools.map((pool, i) => (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card hover>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base">{pool.title}</h3>
                    <p className="text-sm text-muted-100">{pool.creator}</p>
                  </div>
                  <ProgressBar value={pool.raised} max={pool.goal} />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-100">{pool.raised} / {pool.goal} USDC</span>
                    <span className="text-warm-300 font-medium">{pool.supporters} supporters</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-100">
                    <span>Ends in {pool.deadline}</span>
                    <Button size="sm">Fund</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}
