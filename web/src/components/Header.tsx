import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../lib/theme'
import { useWallet } from '../lib/wallet'
import { Button } from './ui'
import { NotificationBell } from './NotificationBell'
import { Moon, Sun, Wallet, Globe } from 'lucide-react'

export function Header() {
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { address, connected, connecting, connect, disconnect } = useWallet()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  const truncate = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' },
  ]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-cream-400/30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-warm-300 to-warm-200 flex items-center justify-center">
            <span className="text-cream-50 text-sm font-bold">K</span>
          </div>
          <span className="font-bold text-lg text-text-light">KindlePool</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/explore" className="text-sm text-muted-100 hover:text-text-light transition-colors">{t('nav.explore')}</Link>
          <Link to="/create" className="text-sm text-muted-100 hover:text-text-light transition-colors">{t('nav.create')}</Link>
          <Link to="/dashboard" className="text-sm text-muted-100 hover:text-text-light transition-colors">{t('nav.dashboard')}</Link>
          <Link to="/creator" className="text-sm text-warm-300 hover:text-warm-400 font-medium transition-colors">Studio</Link>
          <Link to="/leaderboard" className="text-sm text-muted-100 hover:text-text-light transition-colors">Leaderboard</Link>
          <Link to="/disputes" className="text-sm text-muted-100 hover:text-text-light transition-colors">Disputes</Link>
          <Link to="/analytics" className="text-sm text-muted-100 hover:text-text-light transition-colors">Analytics</Link>
          <Link to="/developers" className="text-sm text-muted-100 hover:text-text-light transition-colors">Developers</Link>
          <Link to="/pricing" className="text-sm text-muted-100 hover:text-text-light transition-colors">Pricing</Link>
          <Link to="/add-funds" className="text-sm text-warm-300 hover:text-warm-400 font-medium transition-colors">{t('nav.addFunds')}</Link>
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />

          {/* Language switcher */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="p-2 rounded-xl hover:bg-cream-200 transition-colors text-muted-100"
              aria-label="Switch language"
            >
              <Globe size={18} />
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 bg-surface rounded-xl shadow-modal border border-cream-400/50 overflow-hidden z-50 min-w-[100px]"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-cream-200 transition-colors ${
                        i18n.language === lang.code ? 'font-bold text-warm-300' : 'text-text-light'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-cream-200 transition-colors text-muted-100"
            aria-label={t('theme.toggle')}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-100 hidden sm:inline">
                <Wallet size={14} className="inline mr-1" />
                {address ? truncate(address) : ''}
              </span>
              <Button size="sm" variant="ghost" onClick={disconnect}>{t('nav.disconnect')}</Button>
            </div>
          ) : (
            <Button size="sm" onClick={connect} loading={connecting}>
              {connecting ? t('nav.connecting') : t('nav.connect')}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
