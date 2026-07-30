import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export interface Milestone {
  label: string
  percent: number
  completed: boolean
  current: boolean
}

interface MilestoneTimelineProps {
  milestones: Milestone[]
  totalAmount?: string
  className?: string
}

export function MilestoneTimeline({ milestones, totalAmount, className = '' }: MilestoneTimelineProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {milestones.map((m, i) => {
        const payout = totalAmount ? (Number(totalAmount) * m.percent / 100).toFixed(2) : null
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative flex items-start gap-4 p-4 rounded-xl transition-colors ${
              m.current ? 'bg-warm-100/30 border border-warm-300/30' : m.completed ? 'bg-cream-200' : 'bg-cream-100'
            }`}
          >
            {/* Step indicator */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              m.completed ? 'bg-success text-cream-50' : m.current ? 'bg-warm-300 text-cream-50' : 'bg-cream-300 text-muted-200'
            }`}>
              {m.completed ? <Check size={16} /> : i + 1}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`font-medium text-sm ${m.current ? 'text-warm-300' : ''}`}>
                  {m.label}
                </h4>
                {payout && (
                  <span className="text-xs text-muted-100">{payout} USDC</span>
                )}
              </div>
              {payout && (
                <div className="mt-1.5 h-1.5 bg-cream-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.completed ? 'bg-success' : m.current ? 'bg-warm-300' : 'bg-cream-400'
                    }`}
                    style={{ width: `${m.percent}%` }}
                  />
                </div>
              )}
              {m.current && (
                <p className="text-xs text-warm-300 mt-1">Current milestone — awaiting approval</p>
              )}
            </div>

            {/* Connector line */}
            {i < milestones.length - 1 && (
              <div className={`absolute left-4 top-10 w-0.5 h-6 -translate-x-1/2 ${
                m.completed ? 'bg-success' : 'bg-cream-300'
              }`} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
