import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, Button, ProgressBar, Badge, Modal, Input } from '../components/ui'
import { useWallet } from '../lib/wallet'
import { useToast } from '../lib/toast'
import { useState, useMemo } from 'react'
import { getPoolById } from '../lib/mock-data'
import { RaiseDisputeModal } from '../components/RaiseDisputeModal'
import { ArrowLeft, Check, X, Upload, AlertTriangle } from 'lucide-react'

export function PoolDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { connected } = useWallet()
  const { toast } = useToast()

  const pool = useMemo(() => getPoolById(Number(id)), [id])

  const [showDeposit, setShowDeposit] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [showVote, setShowVote] = useState(false)
  const [showSubmitWork, setShowSubmitWork] = useState(false)
  const [showDispute, setShowDispute] = useState(false)

  const remaining = pool ? pool.goal - pool.raised : 0
  const isCreator = false

  const badgeVariant = pool?.status === 'open' ? 'default' : pool?.status === 'vote' ? 'warning' : pool?.status === 'paid' ? 'success' : 'error'

  const handleDeposit = () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast('Enter a valid amount', 'error')
      return
    }
    const amt = Number(depositAmount)
    if (amt > remaining) {
      toast(`Amount exceeds remaining goal (${remaining} USDC)`, 'error')
      return
    }
    toast(`Deposited ${depositAmount} USDC to pool #${id}`, 'success')
    setShowDeposit(false)
    setDepositAmount('')
  }

  const handleVote = (approve: boolean) => {
    toast(approve ? 'Voted approved!' : 'Voted rejected.', approve ? 'success' : 'error')
    setShowVote(false)
  }

  const handleSubmitWork = () => {
    toast('Work submitted for review!', 'success')
    setShowSubmitWork(false)
  }

  if (!pool) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Pool not found</h2>
        <p className="text-muted-100 mt-2">No pool with ID #{id} exists.</p>
        <button onClick={() => navigate(-1)} className="text-warm-300 mt-4 inline-block hover:text-warm-400 transition-colors">
          ← Go back
        </button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-100 hover:text-text-light transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{pool.title}</h1>
            <p className="text-muted-100 mt-1">{pool.creator} · {pool.category}</p>
          </div>
          <Badge variant={badgeVariant}>{pool.status}</Badge>
        </div>
        <p className="text-text-light leading-relaxed">{pool.description}</p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">
            {pool.raised} <span className="text-base font-normal text-muted-100">/ {pool.goal} USDC</span>
          </span>
          <span className="text-sm text-muted-100">{pool.deadline > 0 ? `${pool.deadline} days left` : 'Ending today'}</span>
        </div>
        <ProgressBar value={pool.raised} max={pool.goal} />
        <div className="flex flex-col sm:flex-row gap-3">
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
          {isCreator && pool.status === 'open' && (
            <Button variant="secondary" className="flex-1" size="lg" onClick={() => setShowSubmitWork(true)}>
              <Upload size={18} /> Submit Work
            </Button>
          )}
          {(pool.status === 'vote' || pool.status === 'expired') && (
            <Button variant="secondary" className="flex-1" size="lg" onClick={() => connected ? setShowDispute(true) : toast('Connect wallet first', 'error')}>
              <AlertTriangle size={18} /> Raise Dispute
            </Button>
          )}
        </div>
      </Card>

      {pool.workHash && (
        <Card className="space-y-2">
          <h3 className="font-semibold">Submitted Work</h3>
          <p className="text-sm text-muted-100">Hash: {pool.workHash}</p>
          {pool.voteDeadline && (
            <p className="text-sm text-muted-100">Voting ends: {new Date(pool.voteDeadline * 1000).toLocaleDateString()}</p>
          )}
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Supporters ({pool.supporters.length})</h2>
        {pool.supporters.length === 0 ? (
          <p className="text-muted-100 text-sm">No supporters yet.</p>
        ) : (
          <div className="space-y-2">
            {pool.supporters.map((s) => (
              <div key={s.address} className="flex items-center justify-between py-2 px-4 bg-cream-200 rounded-xl">
                <span className="text-sm font-medium">{s.address}</span>
                <span className="text-sm text-muted-100">{s.amount} USDC</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showDeposit} onClose={() => setShowDeposit(false)} title="Fund Pool">
        <div className="space-y-4">
          <Input
            label="Amount (USDC)"
            type="number"
            min={1}
            max={remaining}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder={`Max ${remaining} USDC`}
          />
          <div className="flex gap-2">
            {[25, 50, 100, remaining].filter((a) => a <= remaining).map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(String(amt))}
                className="flex-1 py-2 text-sm rounded-xl bg-cream-200 hover:bg-cream-300 transition-colors font-medium"
              >
                {amt === remaining ? 'Max' : amt}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={handleDeposit} disabled={!depositAmount || Number(depositAmount) <= 0 || Number(depositAmount) > remaining}>
            Deposit {depositAmount || '0'} USDC
          </Button>
        </div>
      </Modal>

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

      <RaiseDisputeModal
        open={showDispute}
        onClose={() => setShowDispute(false)}
        poolTitle={pool.title}
        goalAmount={String(pool.goal)}
        poolStatus={pool.status}
      />

      <Modal open={showSubmitWork} onClose={() => setShowSubmitWork(false)} title="Submit Work">
        <div className="space-y-4">
          <p className="text-sm text-muted-100">Upload the completed work for supporter review.</p>
          <div className="border-2 border-dashed border-cream-400 rounded-xl p-8 text-center">
            <Upload size={32} className="mx-auto text-muted-100 mb-2" />
            <p className="text-sm text-muted-100">Drag & drop or click to upload</p>
          </div>
          <Button className="w-full" onClick={handleSubmitWork}>Submit for Review</Button>
        </div>
      </Modal>
    </motion.div>
  )
}
