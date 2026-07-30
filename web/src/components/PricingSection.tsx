import { motion } from 'framer-motion'
import { Card, Button, Badge } from './ui'
import { useNavigate } from 'react-router-dom'
import { Check, Star, Zap } from 'lucide-react'

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    fee: '0.5%',
    description: 'For creators getting started',
    icon: <Star size={24} />,
    features: [
      'Create unlimited pools',
      'Community voting & disputes',
      'Automatic refunds',
      'Basic discoverability',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    fee: '1.5%',
    description: 'For serious creators',
    icon: <Zap size={24} />,
    features: [
      'All Free features',
      'Boosted visibility in search',
      'Featured placement on homepage',
      'Email notification to relevant supporters',
      'Priority support',
      'Custom cover image & branding',
      'Advanced analytics dashboard',
    ],
    cta: 'Go Premium',
    popular: true,
  },
]

export function PricingSection() {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Simple Pricing</h2>
        <p className="text-muted-100 mt-2 max-w-lg mx-auto">
          Pay only when your pool succeeds. No hidden fees, no monthly subscriptions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`relative h-full flex flex-col ${tier.popular ? 'border-warm-300 border-2' : ''}`}>
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="warning">Most Popular</Badge>
                </div>
              )}

              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tier.popular ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 text-muted-200'
                  }`}>
                    {tier.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{tier.name}</h3>
                    <p className="text-sm text-muted-100">{tier.description}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.fee}</span>
                  <span className="text-sm text-muted-100">per successful pool</span>
                </div>

                <ul className="space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check size={16} className="text-success shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full mt-6"
                variant={tier.popular ? 'primary' : 'secondary'}
                onClick={() => navigate('/create')}
              >
                {tier.cta}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
