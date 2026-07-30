import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Input, Card } from '../components/ui'
import { useWallet } from '../lib/wallet'
import { useToast } from '../lib/toast'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

export function CreatePool() {
  const { connected } = useWallet()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('art')
  const [goal, setGoal] = useState('')
  const [deadline, setDeadline] = useState('7')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!connected) {
      toast('Connect your wallet first', 'error')
      return
    }
    setSubmitting(true)
    // Simulate contract call
    await new Promise((r) => setTimeout(r, 1500))
    setSubmitting(false)
    setSubmitted(true)
    toast('Pool created successfully!', 'success')
    setTimeout(() => navigate('/explore'), 2000)
  }

  if (!connected) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Create a Pool</h1>
        <p className="text-muted-100 mb-6">Connect your wallet to create a funding pool.</p>
        <Button onClick={() => toast('Please connect wallet from the header', 'info')}>Connect Wallet</Button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-16">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
          <Check className="text-success" size={32} />
        </motion.div>
        <h1 className="text-3xl font-bold mb-2">Pool Created!</h1>
        <p className="text-muted-100">Redirecting to explore...</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Create a Pool</h1>
        <p className="text-muted-100 mt-2">Fund your next creative project</p>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 text-muted-100'}`}>
              {s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 transition-colors ${step > s ? 'bg-warm-300' : 'bg-cream-300'}`} />}
          </div>
        ))}
      </div>

      <Card className="space-y-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold">Project Details</h2>
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you creating?" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-200">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={4}
                className="w-full px-4 py-2.5 bg-surface border border-cream-400 rounded-xl text-text-light placeholder:text-cream-500 focus:outline-none focus:border-warm-300 focus:ring-1 focus:ring-warm-300/30 transition-all resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-200">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-cream-400 rounded-xl text-text-light focus:outline-none focus:border-warm-300 appearance-none"
              >
                <option value="art">Art</option>
                <option value="writing">Writing</option>
                <option value="music">Music</option>
                <option value="code">Code</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="pt-4">
              <Button className="w-full" onClick={() => setStep(2)} disabled={!title || !description}>Continue</Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold">Funding</h2>
            <Input label="Goal (USDC)" type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="How much do you need?" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-200">Deadline (days)</label>
              <select
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-cream-400 rounded-xl text-text-light focus:outline-none focus:border-warm-300 appearance-none"
              >
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!goal || Number(goal) <= 0}>Continue</Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold">Review & Confirm</h2>
            <div className="space-y-3 bg-cream-200 rounded-xl p-4">
              <div className="flex justify-between text-sm"><span className="text-muted-100">Title</span><span className="font-medium">{title}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-100">Category</span><span className="font-medium">{category}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-100">Goal</span><span className="font-medium">{goal} USDC</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-100">Deadline</span><span className="font-medium">{deadline} days</span></div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-100 mb-4">
                By creating this pool, you agree to deliver the promised work. Funds release only after supporter approval.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} loading={submitting}>
                {submitting ? 'Creating Pool...' : 'Create Pool'}
              </Button>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}
