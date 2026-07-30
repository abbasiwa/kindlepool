import { motion } from 'framer-motion'
import { PricingSection } from '../components/PricingSection'

export function Pricing() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
      <PricingSection />
    </motion.div>
  )
}
