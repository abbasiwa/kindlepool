import { useState } from 'react'
import { Button, Input, Modal } from './ui'
import { useToast } from '../lib/toast'
import { useWallet } from '../lib/wallet'
import { Scale, ThumbsUp, ThumbsDown, Check } from 'lucide-react'

interface ArbitrateModalProps {
  open: boolean
  onClose: () => void
  disputeId: number
  poolTitle: string
  onVoteCast: () => void
}

export function ArbitrateModal({ open, onClose, disputeId, poolTitle, onVoteCast }: ArbitrateModalProps) {
  const { connected } = useWallet()
  const { toast } = useToast()
  const [voteForCreator, setVoteForCreator] = useState<boolean | null>(null)
  const [reasonHash, setReasonHash] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!connected) { toast('Connect wallet first', 'error'); return }
    if (voteForCreator === null) { toast('Cast your vote first', 'error'); return }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 2000))
    setSubmitting(false)
    toast(voteForCreator ? 'Voted in favor of creator' : 'Voted in favor of supporters', 'success')
    onVoteCast()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Arbitrate Dispute">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warm-100/30 border border-warm-300/30">
          <Scale className="text-warm-300 shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium">Dispute #{disputeId} — {poolTitle}</p>
            <p className="text-xs text-muted-100">Review the evidence and cast your vote as an arbitrator.</p>
          </div>
        </div>

        <p className="text-sm text-muted-200 font-medium">Your Verdict</p>
        <div className="flex gap-3">
          <button onClick={() => setVoteForCreator(true)}
            className={`flex-1 p-4 rounded-xl text-center transition-all ${
              voteForCreator === true ? 'bg-success/20 border-2 border-success' : 'bg-cream-200 hover:bg-cream-300 border-2 border-transparent'
            }`}>
            <ThumbsUp size={24} className={`mx-auto mb-1 ${voteForCreator === true ? 'text-success' : 'text-muted-100'}`} />
            <p className={`text-sm font-medium ${voteForCreator === true ? 'text-success' : ''}`}>For Creator</p>
            <p className="text-xs text-muted-100 mt-0.5">Work meets quality standards</p>
          </button>
          <button onClick={() => setVoteForCreator(false)}
            className={`flex-1 p-4 rounded-xl text-center transition-all ${
              voteForCreator === false ? 'bg-error/20 border-2 border-error' : 'bg-cream-200 hover:bg-cream-300 border-2 border-transparent'
            }`}>
            <ThumbsDown size={24} className={`mx-auto mb-1 ${voteForCreator === false ? 'text-error' : 'text-muted-100'}`} />
            <p className={`text-sm font-medium ${voteForCreator === false ? 'text-error' : ''}`}>For Supporters</p>
            <p className="text-xs text-muted-100 mt-0.5">Work fails quality standards</p>
          </button>
        </div>

        <Input label="Vote Reason (optional hash)" value={reasonHash}
          onChange={(e) => setReasonHash(e.target.value)} placeholder="IPFS hash of your rationale..." />

        <Button className="w-full" onClick={handleSubmit} loading={submitting} disabled={voteForCreator === null}>
          {submitting ? 'Casting Vote...' : <><Check size={16} /> Cast Vote</>}
        </Button>
      </div>
    </Modal>
  )
}
