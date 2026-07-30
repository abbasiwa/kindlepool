import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Input, Modal } from './ui'
import { useCreator } from '../lib/creator'
import { useToast } from '../lib/toast'
import { BadgeCheck, Check } from 'lucide-react'

interface CreatorVerificationProps {
  open: boolean
  onClose: () => void
}

export function CreatorVerification({ open, onClose }: CreatorVerificationProps) {
  const { profile, isVerified, startVerification, verifyEmail, verifySocial, updateProfile } = useCreator()
  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [email, setEmail] = useState('')
  const [twitterHandle, setTwitterHandle] = useState('')
  const [githubHandle, setGithubHandle] = useState('')
  const [verifying, setVerifying] = useState(false)

  const stepLabels = ['Profile', 'Email', 'Social', 'Done']
  const totalSteps = stepLabels.length

  const handleStart = () => {
    startVerification()
    setStep(1)
  }

  const handleSaveProfile = () => {
    updateProfile({ displayName, bio })
    setStep(2)
  }

  const handleVerifyEmail = async () => {
    if (!email || !email.includes('@')) {
      toast('Enter a valid email', 'error')
      return
    }
    setVerifying(true)
    await verifyEmail(email)
    setVerifying(false)
    setStep(3)
  }

  const handleVerifySocial = async (platform: string, handle: string) => {
    if (!handle) { toast(`Enter your ${platform} handle`, 'error'); return }
    setVerifying(true)
    await verifySocial(platform, handle)
    setVerifying(false)
    setStep(4)
  }

  const handleFinish = () => {
    onClose()
    toast('Profile complete! You can now create pools.', 'success')
  }

  return (
    <Modal open={open} onClose={onClose} title="Creator Setup">
      {!profile ? (
        <div className="space-y-4 text-center py-4">
          <BadgeCheck size={48} className="mx-auto text-warm-300" />
          <h3 className="font-bold text-lg">Become a Verified Creator</h3>
          <p className="text-sm text-muted-100">
            Verified creators build trust with supporters. Verify your identity to unlock higher pool limits and featured placement.
          </p>
          <Button className="w-full" onClick={handleStart}>Get Started</Button>
        </div>
      ) : isVerified ? (
        <div className="space-y-4 text-center py-4">
          <BadgeCheck size={48} className="mx-auto text-success" />
          <h3 className="font-bold text-lg">You're Verified!</h3>
          <p className="text-sm text-muted-100">Your creator profile is complete.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {profile.socialLinks.map((l) => (
              <span key={l.platform} className="px-3 py-1 bg-success/20 text-success text-xs rounded-full">{l.platform} ✓</span>
            ))}
            {profile.email && <span className="px-3 py-1 bg-success/20 text-success text-xs rounded-full">Email ✓</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step indicator — 4 steps, active correctly */}
          <div className="flex items-center justify-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > i + 1 ? 'bg-success text-cream-50' : step === i + 1 ? 'bg-warm-300 text-cream-50' : 'bg-cream-200 text-muted-100'
                }`}>
                  {step > i + 1 ? <Check size={14} /> : i + 1}
                </div>
                {i < totalSteps - 1 && <div className={`w-6 h-0.5 ${step > i + 1 ? 'bg-success' : 'bg-cream-300'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h3 className="font-bold">Public Profile</h3>
              <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your creator name" />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-200">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell supporters about yourself..." rows={3} maxLength={500}
                  className="w-full px-4 py-2.5 bg-surface border border-cream-400 rounded-xl text-text-light placeholder:text-cream-500 focus:outline-none focus:border-warm-300 resize-none" />
              </div>
              <Button className="w-full" onClick={handleSaveProfile} disabled={!displayName}>Continue</Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h3 className="font-bold">Verify Email</h3>
              <p className="text-sm text-muted-100">We'll send a verification code to your email.</p>
              <Input label="Email Address" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="creator@example.com" />
              <Button className="w-full" onClick={handleVerifyEmail} loading={verifying}>
                {verifying ? 'Sending...' : 'Send Verification'}
              </Button>
              <button onClick={() => setStep(3)} className="text-xs text-muted-100 hover:text-text-light mx-auto block">Skip →</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h3 className="font-bold">Link Social Accounts</h3>
              <p className="text-sm text-muted-100">Link at least one social account to verify your identity.</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-cream-200">
                  <span className="text-lg shrink-0">𝕏</span>
                  <input value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value)}
                    placeholder="Twitter / X handle (@username)"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-text-light placeholder:text-cream-500" />
                  <Button size="sm" onClick={() => handleVerifySocial('twitter', twitterHandle)} loading={verifying}>Verify</Button>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-cream-200">
                  <span className="text-lg shrink-0">⌨️</span>
                  <input value={githubHandle} onChange={(e) => setGithubHandle(e.target.value)}
                    placeholder="GitHub username"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-text-light placeholder:text-cream-500" />
                  <Button size="sm" onClick={() => handleVerifySocial('github', githubHandle)} loading={verifying}>Verify</Button>
                </div>
              </div>
              <Button variant="secondary" className="w-full" onClick={handleFinish}>
                {profile?.socialLinks.length ? 'Complete' : 'Skip for now'}
              </Button>
            </motion.div>
          )}
        </div>
      )}
    </Modal>
  )
}
