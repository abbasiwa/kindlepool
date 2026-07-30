import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, Button, ProgressBar, Badge, Modal, Input } from '../components/ui'
import { useWallet } from '../lib/wallet'
import { useToast } from '../lib/toast'
import { useState } from 'react'
import { ArrowLeft, Check, X } from 'lucide-react'

const MOCK_POOL = {
  id: 1,
  title: 'Digital Portrait Commission',
  creator: '@artbymaya',
  creatorAddress: 'GAX23...27RC',
  description: 'I will paint a digital portrait of anyone who funds this pool. High resolution, fully colored, delivered in 5 business days.',
  goal: 500,
  raised: 340,
  supporters: [
    { address: 'GABC...1234', amount: 100 },
    { address: 'GDEF...5678', amount: 200 },
    { address: 'GHIJ...9012', amount: 40 },
  ],
  deadline: 3,
  status: 'open',
  category: 'art',
  workHash: null,
  voteDeadline: null,
}

export function PoolDetail() {
  const { id } = useParams()
  const { connected } = useWallet()
  const { toast } = useToast()
  const pool = MOCK_POOL

  const [showDeposit, setShowDeposit] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [showVote, setShowVote] = useState(false)

  const handleDeposit = () => {
    if (!depositAmount || Number(depositAmount) <= 0) return
    toast(`Deposited ${depositAmount} USDC to pool #${id}`, 'success')
    setShowDeposit(false)
    setDepositAmount('')
  }

  const handleVote = (approve: boolean) => {
    toast(approve ? 'Voted approved!' : 'Voted rejected.', approve ? 'success' : 'error')
    setShowVote(false)
  }

  if (!pool) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Pool not found</h2>
        <Link to="/explore" className="text-warm-300 mt-2 inline-block">← Back to explore</Link>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-8">
      <Link to="/explore" className="inline-flex items-center gap-2 text-sm text-muted-100 hover:text-text-light transition-colors">
        <ArrowLeft size={16} /> Back to explore
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{pool.title}</h1>
            <p className="text-muted-100 mt-1">{pool.creator}</p>
          </div>
          <Badge variant={pool.status === 'open' ? 'default' : pool.status === 'vote' ? 'warning' : 'success'}>
            {pool.status}
          </Badge>
        </div>
        <p className="text-text-light leading-relaxed">{pool.description}</p>
      </div>

      {/* Progress */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{pool.raised} <span className="text-base font-normal text-muted-100">/ {pool.goal} USDC</span></span>
          <span className="text-sm text-muted-100">{pool.deadline} days left</span>
        </div>
        <ProgressBar value={pool.raised} max={pool.goal} />
        <div className="flex gap-3">
          {pool.status === 'open' && (
            <Button className="flex-1" size="lg" onClick={() => connected ? setShowDeposit(true) : toast('Connect wallet first', 'error')}>
              Fund This Pool
            </Button>
          )}
          {pool.status === 'vote' && (
            <Button className="flex-1" size="lg" onClick={() => connected ? setShowVote(true) : toast('Connect wallet first', 'error')}>
              Vote on Work
            </Button>
          )}
        </div>
      </Card>

      {/* Supporters */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Supporters ({pool.supporters.length})</h2>
        <div className="space-y-3">
          {pool.supporters.map((s) => (
            <div key={s.address} className="flex items-center justify-between py-2 px-4 bg-cream-200 rounded-xl">
              <span className="text-sm font-medium">{s.address}</span>
              <span className="text-sm text-muted-100">{s.amount} USDC</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit Modal */}
      <Modal open={showDeposit} onClose={() => setShowDeposit(false)} title="Fund Pool">
        <div className="space-y-4">
          <Input
            label="Amount (USDC)"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Enter amount..."
          />
          <div className="flex gap-2">
            {[25, 50, 100, 200].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(String(amt))}
                className="flex-1 py-2 text-sm rounded-xl bg-cream-200 hover:bg-cream-300 transition-colors font-medium"
              >
                {amt}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={handleDeposit} disabled={!depositAmount || Number(depositAmount) <= 0}>
            Deposit {depositAmount || '0'} USDC
          </Button>
        </div>
      </Modal>

      {/* Vote Modal */}
      <Modal open={showVote} onClose={() => setShowVote(false)} title="Vote on Work">
        <div className="space-y-4 text-center">
          <p className="text-muted-100">Does this work meet the quality you expected?</p>
          <div className="flex gap-4">
            <Button variant="primary" className="flex-1" onClick={() => handleVote(true)}>
              <Check size={18} /> Approve
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => handleVote(false)}>
              <X size={18} /> Reject
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
