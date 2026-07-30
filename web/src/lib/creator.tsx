import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useToast } from '../lib/toast'
import { useWallet } from '../lib/wallet'

export interface CreatorProfile {
  address: string
  displayName: string
  bio: string
  avatar?: string
  email?: string
  socialLinks: { platform: string; handle: string; verified: boolean }[]
  verified: boolean
  verificationTier: 'unverified' | 'email' | 'social' | 'id'
  totalPools: number
  totalEarned: string
  successRate: number
  joinedAt: number
}

interface CreatorContextType {
  profile: CreatorProfile | null
  isCreator: boolean
  isVerified: boolean
  verificationTier: CreatorProfile['verificationTier']
  startVerification: () => void
  verifyEmail: (email: string) => Promise<boolean>
  verifySocial: (platform: string, handle: string) => Promise<boolean>
  updateProfile: (data: Partial<CreatorProfile>) => void
  refreshProfile: () => Promise<void>
}

const CreatorContext = createContext<CreatorContextType>({
  profile: null,
  isCreator: false,
  isVerified: false,
  verificationTier: 'unverified',
  startVerification: () => {},
  verifyEmail: async () => false,
  verifySocial: async () => false,
  updateProfile: () => {},
  refreshProfile: async () => {},
})

export function CreatorProvider({ children }: { children: ReactNode }) {
  const { address } = useWallet()
  const { toast } = useToast()

  const [profile, setProfile] = useState<CreatorProfile | null>(null)

  // Load profile from localStorage on wallet change
  useEffect(() => {
    if (!address) { setProfile(null); return }
    try {
      const stored = localStorage.getItem(`kindlepool-creator-${address}`)
      if (stored) setProfile(JSON.parse(stored))
      else setProfile(null)
    } catch { setProfile(null) }
  }, [address])

  const isCreator = !!profile
  const isVerified = profile?.verified ?? false
  const verificationTier = profile?.verificationTier ?? 'unverified'

  const startVerification = useCallback(() => {
    if (!profile) {
      const p: CreatorProfile = {
        address: address ?? '',
        displayName: '',
        bio: '',
        socialLinks: [],
        verified: false,
        verificationTier: 'unverified',
        totalPools: 0,
        totalEarned: '0',
        successRate: 0,
        joinedAt: Date.now(),
      }
      setProfile(p)
      if (address) localStorage.setItem(`kindlepool-creator-${address}`, JSON.stringify(p))
    }
  }, [address, profile])

  const verifyEmail = useCallback(async (email: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 1500))
    if (!profile || !address) return false
    const updated = { ...profile, email, verificationTier: 'email' as const }
    setProfile(updated)
    localStorage.setItem(`kindlepool-creator-${address}`, JSON.stringify(updated))
    toast('Email verified!', 'success')
    return true
  }, [address, profile, toast])

  const verifySocial = useCallback(async (platform: string, handle: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 1500))
    if (!profile || !address) return false
    const existing = profile.socialLinks.filter((l) => l.platform !== platform)
    const updated = {
      ...profile,
      socialLinks: [...existing, { platform, handle, verified: true }],
      verificationTier: 'social' as const,
      verified: true,
    }
    setProfile(updated)
    localStorage.setItem(`kindlepool-creator-${address}`, JSON.stringify(updated))
    toast(`${platform} account verified!`, 'success')
    return true
  }, [address, profile, toast])

  const updateProfile = useCallback((data: Partial<CreatorProfile>) => {
    if (!profile || !address) return
    const updated = { ...profile, ...data }
    setProfile(updated)
    localStorage.setItem(`kindlepool-creator-${address}`, JSON.stringify(updated))
  }, [address, profile])

  const refreshProfile = useCallback(async () => {
    if (!address) return
    const stored = localStorage.getItem(`kindlepool-creator-${address}`)
    if (stored) setProfile(JSON.parse(stored))
  }, [address])

  return (
    <CreatorContext.Provider value={{
      profile, isCreator, isVerified, verificationTier,
      startVerification, verifyEmail, verifySocial, updateProfile, refreshProfile,
    }}>
      {children}
    </CreatorContext.Provider>
  )
}

export function useCreator() {
  return useContext(CreatorContext)
}
