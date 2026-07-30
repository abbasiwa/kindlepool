import { useState } from 'react'
import { Button, Input, Modal } from './ui'
import { useToast } from '../lib/toast'
import { useWallet } from '../lib/wallet'
import { AlertTriangle, Send } from 'lucide-react'

interface RaiseDisputeModalProps {
  open: boolean
  onClose: () => void
  poolTitle: string
  goalAmount: string
  poolStatus: string
}

export function RaiseDisputeModal({ open, onClose, poolTitle, goalAmount, poolStatus }: RaiseDisputeModalProps) {
  const { connected, address } = useWallet()
  const { toast } = useToast()
  const [reason, setReason] = useState<'rejected' | 'no_delivery'>('rejected')
  const [evidenceHash, setEvidenceHash] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Exact same formula as contract: goal * 100 / 10000
  const feeAmount = Math.max(1, Math.floor(Number(goalAmount) * 100 / 10000))
  const appealFee = feeAmount * 2

  const handleSubmit = async () => {
    if (!connected) { toast('Connect wallet first', 'error'); return }
    if (!evidenceHash) { toast('Enter evidence hash', 'error'); return }
    if (poolStatus === 'disputed' || poolStatus === 'appealed') {
      toast('This pool already has an active dispute.', 'error')
      return
    }
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 2000))
    setSubmitting(false)
    toast(`Dispute raised on "${poolTitle}" (fee: ${feeAmount} USDC)`, 'success')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Raise Dispute">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Disputing: {poolTitle}</p>
            <p className="text-xs text-muted-100 mt-1">
              Raising a dispute requires a fee of <strong>{feeAmount} USDC</strong> (1% of pool goal). 
              If you win, the fee is returned. Appeals cost <strong>{appealFee} USDC</strong>.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-200">Reason</label>
          <div className="flex gap-2">
            <button onClick={() => setReason('rejected')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                reason === 'rejected' ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 hover:bg-cream-300'
              }`}>Work Rejected Unfairly</button>
            <button onClick={() => setReason('no_delivery')}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                reason === 'no_delivery' ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 hover:bg-cream-300'
              }`}>Work Not Delivered</button>
          </div>
        </div>

        <Input label="Evidence Hash (IPFS)" value={evidenceHash}
          onChange={(e) => setEvidenceHash(e.target.value)}
          placeholder="Qm..." />

        <div className="bg-cream-200 rounded-xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-100">Dispute Fee</span><span>{feeAmount} USDC</span></div>
          <div className="flex justify-between">
            <span className="text-muted-100">Your Wallet</span>
            <span className="font-mono text-xs">{address ? `${address.slice(0, 8)}...${address.slice(-4)}` : 'Not connected'}</span>
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} loading={submitting} disabled={!connected}>
          {!connected ? 'Connect Wallet First' : submitting ? 'Submitting...' : <><Send size={16} /> Raise Dispute</>}
        </Button>
      </div>
    </Modal>
  )
}
