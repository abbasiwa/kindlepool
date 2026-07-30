import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Card, Input } from './ui'
import { useToast } from '../lib/toast'
import { useWallet } from '../lib/wallet'
import { CreditCard, Wallet, Mail, Check, Loader } from 'lucide-react'

type OnrampStep = 'select' | 'amount' | 'processing' | 'done'

export function FiatOnramp() {
  const { connected, address, connect, createEmailWallet, emailWallet } = useWallet()
  const { toast } = useToast()

  const [step, setStep] = useState<OnrampStep>('select')
  const [method, setMethod] = useState<'email' | 'existing' | null>(null)
  const [email, setEmail] = useState('')
  const [fiatAmount, setFiatAmount] = useState('25')
  const [processing, setProcessing] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const moonpayContainer = useRef<HTMLDivElement>(null)

  const handleEmailSignup = useCallback(async () => {
    if (!email || !email.includes('@')) {
      toast('Enter a valid email address', 'error')
      return
    }
    setProcessing(true)
    try {
      const addr = await createEmailWallet(email)
      if (addr) {
        toast('Wallet created! You can now fund pools.', 'success')
      } else {
        toast('Failed to create wallet', 'error')
      }
    } catch {
      toast('Failed to create wallet', 'error')
    } finally {
      setProcessing(false)
    }
  }, [email, toast, createEmailWallet])

  const handleFiatPurchase = useCallback(async () => {
    if (!fiatAmount || Number(fiatAmount) <= 0) {
      toast('Enter a valid amount', 'error')
      return
    }
    setStep('processing')
    setProcessing(true)

    try {
      // Simulate Moonpay purchase
      await new Promise((r) => setTimeout(r, 3000))
      const mockTx = '0x' + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
      setTxHash(mockTx)
      setStep('done')
      toast(`Purchased ${fiatAmount} USDC successfully!`, 'success')
    } catch {
      toast('Purchase failed. Try again.', 'error')
      setStep('amount')
    } finally {
      setProcessing(false)
    }
  }, [fiatAmount, toast])

  const reset = useCallback(() => {
    setStep('select')
    setMethod(null)
    setEmail('')
    setFiatAmount('25')
    setTxHash(null)
  }, [])

  if (step === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4 text-center py-8"
      >
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
          <Check className="text-success" size={32} />
        </div>
        <h3 className="text-xl font-bold">Funds Added!</h3>
        <p className="text-sm text-muted-100">
          {fiatAmount} USDC is available in your wallet.
        </p>
        {txHash && (
          <p className="text-xs text-muted-100 font-mono break-all bg-cream-200 rounded-xl p-3">
            TX: {txHash}
          </p>
        )}
        <Button onClick={reset} variant="secondary">Fund Again</Button>
      </motion.div>
    )
  }

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-warm-100/50 flex items-center justify-center">
          <CreditCard className="text-warm-300" size={20} />
        </div>
        <div>
          <h3 className="font-bold">Add Funds</h3>
          <p className="text-sm text-muted-100">Buy USDC with card or bank</p>
        </div>
      </div>

      {step === 'select' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-muted-100">Choose how to add funds:</p>
          <button
            onClick={() => { setMethod('existing'); setStep('amount') }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-cream-200 hover:bg-cream-300 transition-colors text-left"
          >
            <Wallet size={20} className="text-warm-300 shrink-0" />
            <div>
              <p className="font-medium text-sm">Existing Wallet</p>
              <p className="text-xs text-muted-100">Connect Freighter and buy crypto</p>
            </div>
          </button>
          <button
            onClick={() => { setMethod('email'); setStep('amount') }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-cream-200 hover:bg-cream-300 transition-colors text-left"
          >
            <Mail size={20} className="text-warm-300 shrink-0" />
            <div>
              <p className="font-medium text-sm">Email (No Wallet Needed)</p>
              <p className="text-xs text-muted-100">Create a wallet with just your email</p>
            </div>
          </button>
        </motion.div>
      )}

      {step === 'amount' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {method === 'email' && !emailWallet && (
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          )}

          {emailWallet && (
            <div className="text-sm bg-cream-200 rounded-xl p-3">
              <span className="text-muted-100">Wallet: </span>
              <span className="font-mono text-xs">{emailWallet.slice(0, 8)}...{emailWallet.slice(-4)}</span>
            </div>
          )}

          {(!method || method === 'email' && !emailWallet) ? (
            method === 'email' && !emailWallet ? (
              <Button className="w-full" onClick={handleEmailSignup} loading={processing}>
                {processing ? 'Creating Wallet...' : 'Create Wallet'}
              </Button>
            ) : null
          ) : (
            <>
              <Input
                label="Amount (USD)"
                type="number"
                min={10}
                max={1000}
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                placeholder="Enter amount in USD"
              />
              <div className="flex gap-2">
                {[10, 25, 50, 100].map((a) => (
                  <button
                    key={a}
                    onClick={() => setFiatAmount(String(a))}
                    className={`flex-1 py-2 text-sm rounded-xl font-medium transition-colors ${
                      fiatAmount === String(a) ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 hover:bg-cream-300'
                    }`}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-100 text-center">
                You'll receive ≈ {Number(fiatAmount) * 0.97} USDC (3% fee)
              </p>
              {connected ? (
                <Button className="w-full" size="lg" onClick={handleFiatPurchase} loading={processing}>
                  {processing ? 'Processing...' : `Buy $${fiatAmount} USDC`}
                </Button>
              ) : (
                <Button className="w-full" size="lg" onClick={connect}>
                  Connect Wallet to Continue
                </Button>
              )}
            </>
          )}

          <button onClick={() => setStep('select')} className="text-sm text-muted-100 hover:text-text-light mx-auto block">
            ← Change method
          </button>
        </motion.div>
      )}

      {step === 'processing' && (
        <div className="text-center py-8 space-y-4">
          <Loader className="animate-spin mx-auto text-warm-300" size={32} />
          <p className="text-sm text-muted-100">Processing your purchase...</p>
        </div>
      )}
    </Card>
  )
}
