import { motion } from 'framer-motion'
import { FiatOnramp } from '../components/FiatOnramp'

export function AddFunds() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Add Funds</h1>
        <p className="text-muted-100 mt-2">Buy USDC with your card or bank</p>
      </div>
      <FiatOnramp />
    </motion.div>
  )
}
