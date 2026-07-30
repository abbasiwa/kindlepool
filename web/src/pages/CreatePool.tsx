import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button, Input, Card } from '../components/ui'
import { useWallet } from '../lib/wallet'
import { useToast } from '../lib/toast'
import { useNavigate } from 'react-router-dom'
import { POOL_TEMPLATES, cloneMilestones, type PoolTemplate } from '../lib/pool-templates'
import { Upload, Check, Sparkles } from 'lucide-react'

export function CreatePool() {
  const { connected } = useWallet()
  const { toast } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<PoolTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('art')
  const [goal, setGoal] = useState('')
  const [deadline, setDeadline] = useState(7)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [milestones, setMilestones] = useState<{ label: string; percent: number }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const displayStep = selectedTemplate ? step + 1 : step

  const errors: Record<string, string> = {}
  if (displayStep === 1) {
    if (title.length > 100) errors.title = 'Title must be under 100 characters'
    if (description.length > 2000) errors.description = 'Description must be under 2000 characters'
  }
  if (displayStep === 2) {
    if (!goal || Number(goal) <= 0) errors.goal = 'Enter a valid goal amount'
    if (Number(goal) > 1000000) errors.goal = 'Goal cannot exceed 1,000,000 USDC'
  }

  const handleSubmit = async () => {
    if (!connected) { toast('Connect your wallet first', 'error'); return }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSubmitting(false)
    setSubmitted(true)
    toast('Pool created successfully!', 'success')
    setTimeout(() => navigate('/explore'), 2000)
  }

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Create a Pool</h1>
        <p className="text-muted-100 mb-6">Connect your wallet to create a funding pool.</p>
        <Button onClick={() => toast('Connect wallet from the header', 'info')}>Connect Wallet</Button>
      </motion.div>
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

      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${displayStep >= s ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 text-muted-100'}`}>
              {s === 0 ? <Sparkles size={14} /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 rounded transition-colors ${displayStep > s ? 'bg-warm-300' : 'bg-cream-300'}`} />}
          </div>
        ))}
      </div>

      <Card className="space-y-6">
        {/* Step 0: Template Selection */}
        {step === 0 && !selectedTemplate && (
          <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold">Choose a Template</h2>
            <p className="text-sm text-muted-100">Start with a pre-configured template or create a custom pool.</p>
            <div className="grid grid-cols-2 gap-3">
              {POOL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t)
                    setCategory(t.category)
                    setGoal(String(t.defaultGoal))
                    setDeadline(t.defaultDeadline)
                    setMilestones(cloneMilestones(t.suggestedMilestones))
                    if (t.id !== 'custom') setDescription('')
                    setStep(1)
                  }}
                  className="text-left p-4 rounded-xl bg-cream-200 hover:bg-cream-300 transition-colors space-y-2"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <h3 className="font-medium text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-100">{t.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 0 && selectedTemplate && (
          <motion.div key="s0b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedTemplate.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{selectedTemplate.name}</h2>
                <button onClick={() => { setSelectedTemplate(null); setStep(0) }} className="text-xs text-muted-100 hover:text-warm-300">
                  Change template
                </button>
              </div>
            </div>

            {/* Suggested Milestones */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Suggested Milestones</h3>
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-cream-200">
                  <span className="text-xs font-bold text-warm-300 w-6">{i + 1}</span>
                  <input
                    value={m.label}
                    onChange={(e) => {
                      const updated = [...milestones]
                      updated[i] = { ...updated[i], label: e.target.value }
                      setMilestones(updated)
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                  />
                  <span className="text-xs text-muted-100 w-12 text-right">{m.percent}%</span>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={() => setStep(1)}>Continue</Button>
          </motion.div>
        )}

        {displayStep === 1 && selectedTemplate && (
          <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold">Project Details</h2>
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you creating?" error={errors.title} maxLength={100} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-200">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={4}
                maxLength={2000}
                className="w-full px-4 py-2.5 bg-surface border border-cream-400 rounded-xl text-text-light placeholder:text-cream-500 focus:outline-none focus:border-warm-300 focus:ring-1 focus:ring-warm-300/30 transition-all resize-none"
              />
              <span className="text-xs text-muted-100 text-right">{description.length}/2000</span>
              {errors.description && <span className="text-sm text-error">{errors.description}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-200">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 bg-surface border border-cream-400 rounded-xl text-text-light focus:outline-none focus:border-warm-300 appearance-none"
                >
                  <option value="art">Art</option>
                  <option value="writing">Writing</option>
                  <option value="music">Music</option>
                  <option value="code">Code</option>
                  <option value="other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-100">▼</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-200">Cover Image (optional)</label>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-cream-400 rounded-xl p-6 text-center hover:border-warm-300 transition-colors"
              >
                <Upload size={24} className="mx-auto text-muted-100 mb-1" />
                <span className="text-sm text-muted-100">{coverFile ? coverFile.name : 'Click to upload cover image'}</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!title || !description}>Continue</Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold">Funding</h2>
            <Input label="Goal (USDC)" type="number" min={1} max={1000000} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="How much do you need?" error={errors.goal} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-200">Deadline</label>
              <div className="relative">
                <select
                  value={deadline}
                  onChange={(e) => setDeadline(Number(e.target.value))}
                  className="w-full px-4 py-2.5 pr-10 bg-surface border border-cream-400 rounded-xl text-text-light focus:outline-none focus:border-warm-300 appearance-none"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-100">▼</div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!goal || Number(goal) <= 0}>Continue</Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-xl font-bold">Review & Confirm</h2>
            <div className="space-y-3 bg-cream-200 rounded-xl p-4">
              <div className="flex justify-between text-sm"><span className="text-muted-100">Title</span><span className="font-medium">{title}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-100">Category</span><span className="font-medium capitalize">{category}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-100">Goal</span><span className="font-medium">{goal} USDC</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-100">Deadline</span><span className="font-medium">{deadline} days</span></div>
              {coverFile && <div className="flex justify-between text-sm"><span className="text-muted-100">Cover</span><span className="font-medium">{coverFile.name}</span></div>}
            </div>
            <p className="text-xs text-muted-100">
              By creating this pool, you agree to deliver the promised work. Funds release only after supporter approval.
            </p>
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
