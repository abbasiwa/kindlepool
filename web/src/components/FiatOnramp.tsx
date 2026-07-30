import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Card, Input } from './ui'
import { useToast } from '../lib/toast'
import { useWallet } from '../lib/wallet'
import { useTranslation } from 'react-i18next'
import { CreditCard, Wallet, Mail, Check, Loader } from 'lucide-react'

type OnrampStep = 'select' | 'amount' | 'processing' | 'done'

export function FiatOnramp() {
  const { t } = useTranslation()
  const { connected, connect, createEmailWallet, emailWallet } = useWallet()
  const { toast } = useToast()

  const [step, setStep] = useState<OnrampStep>('select')
  const [method, setMethod] = useState<'email' | 'existing' | null>(null)
  const [email, setEmail] = useState('')
  const [fiatAmount, setFiatAmount] = useState('25')
  const [processing, setProcessing] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleEmailSignup = useCallback(async () => {
    if (!email || !email.includes('@')) {
      toast(t('addFunds.email.placeholder'), 'error')
      return
    }
    setProcessing(true)
    try {
      const addr = await createEmailWallet(email)
      toast(addr ? t('addFunds.purchase.successDesc', { amount: '0' }) : t('addFunds.purchase.failed'), addr ? 'success' : 'error')
    } catch {
      toast(t('addFunds.purchase.failed'), 'error')
    } finally {
      setProcessing(false)
    }
  }, [email, t, toast, createEmailWallet])

  const handleFiatPurchase = useCallback(async () => {
    if (!fiatAmount || Number(fiatAmount) <= 0) {
      toast(t('addFunds.purchase.failed'), 'error')
      return
    }
    setStep('processing')
    setProcessing(true)
    try {
      await new Promise((r) => setTimeout(r, 3000))
      const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      setTxHash(mockTx)
      setStep('done')
      toast(t('addFunds.purchase.success'), 'success')
    } catch {
      toast(t('addFunds.purchase.failed'), 'error')
      setStep('amount')
    } finally {
      setProcessing(false)
    }
  }, [fiatAmount, t, toast])

  const reset = useCallback(() => {
    setStep('select')
    setMethod(null)
    setEmail('')
    setFiatAmount('25')
    setTxHash(null)
  }, [])

  if (step === 'done') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center py-8">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
          <Check className="text-success" size={32} />
        </div>
        <h3 className="text-xl font-bold">{t('addFunds.purchase.success')}</h3>
        <p className="text-sm text-muted-100">{t('addFunds.purchase.successDesc', { amount: fiatAmount })}</p>
        {txHash && <p className="text-xs text-muted-100 font-mono break-all bg-cream-200 rounded-xl p-3">TX: {txHash}</p>}
        <Button onClick={reset} variant="secondary">{t('addFunds.done.again')}</Button>
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
          <h3 className="font-bold">{t('addFunds.title')}</h3>
          <p className="text-sm text-muted-100">{t('addFunds.subtitle')}</p>
        </div>
      </div>

      {step === 'select' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm text-muted-100">{t('addFunds.select.title')}</p>
          <button
            onClick={() => { setMethod('existing'); setStep('amount') }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-cream-200 hover:bg-cream-300 transition-colors text-left"
          >
            <Wallet size={20} className="text-warm-300 shrink-0" />
            <div>
              <p className="font-medium text-sm">{t('addFunds.select.existing')}</p>
              <p className="text-xs text-muted-100">{t('addFunds.select.existingDesc')}</p>
            </div>
          </button>
          <button
            onClick={() => { setMethod('email'); setStep('amount') }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-cream-200 hover:bg-cream-300 transition-colors text-left"
          >
            <Mail size={20} className="text-warm-300 shrink-0" />
            <div>
              <p className="font-medium text-sm">{t('addFunds.select.email')}</p>
              <p className="text-xs text-muted-100">{t('addFunds.select.emailDesc')}</p>
            </div>
          </button>
        </motion.div>
      )}

      {step === 'amount' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {method === 'email' && !emailWallet && (
            <Input label={t('addFunds.email.label')} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder={t('addFunds.email.placeholder')} />
          )}
          {emailWallet && (
            <div className="text-sm bg-cream-200 rounded-xl p-3">
              <span className="text-muted-100">Wallet: </span>
              <span className="font-mono text-xs">{emailWallet.slice(0, 8)}...{emailWallet.slice(-4)}</span>
            </div>
          )}
          {method === 'email' && !emailWallet ? (
            <Button className="w-full" onClick={handleEmailSignup} loading={processing}>
              {processing ? t('addFunds.email.creating') : t('addFunds.email.create')}
            </Button>
          ) : method === 'existing' && !connected ? (
            <Button className="w-full" size="lg" onClick={connect}>
              {t('addFunds.purchase.connect')}
            </Button>
          ) : (
            <>
              <Input label={t('addFunds.purchase.label')} type="number" min={10} max={1000}
                value={fiatAmount} onChange={(e) => setFiatAmount(e.target.value)}
                placeholder={t('addFunds.purchase.placeholder')} />
              <div className="flex gap-2">
                {[10, 25, 50, 100].map((a) => (
                  <button key={a} onClick={() => setFiatAmount(String(a))}
                    className={`flex-1 py-2 text-sm rounded-xl font-medium transition-colors ${
                      fiatAmount === String(a) ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 hover:bg-cream-300'
                    }`}>${a}</button>
                ))}
              </div>
              <p className="text-xs text-muted-100 text-center">
                {t('addFunds.purchase.fee', { amount: (Number(fiatAmount) * 0.97).toFixed(2) })}
              </p>
              <Button className="w-full" size="lg" onClick={handleFiatPurchase} loading={processing}>
                {processing ? t('addFunds.purchase.processing') : t('addFunds.purchase.buy', { amount: fiatAmount })}
              </Button>
            </>
          )}
          <button onClick={() => setStep('select')} className="text-sm text-muted-100 hover:text-text-light mx-auto block">
            {t('addFunds.purchase.change')}
          </button>
        </motion.div>
      )}

      {step === 'processing' && (
        <div className="text-center py-8 space-y-4">
          <Loader className="animate-spin mx-auto text-warm-300" size={32} />
          <p className="text-sm text-muted-100">{t('addFunds.purchase.processing')}</p>
        </div>
      )}
    </Card>
  )
}
