import { Link } from 'react-router-dom'
import { useTheme } from '../lib/theme'
import { useWallet } from '../lib/wallet'
import { Button } from './ui'
import { Moon, Sun, Wallet } from 'lucide-react'

export function Header() {
  const { theme, toggle } = useTheme()
  const { address, connected, connecting, connect, disconnect } = useWallet()

  const truncate = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`

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
          <Link to="/explore" className="text-sm text-muted-100 hover:text-text-light transition-colors">Explore</Link>
          <Link to="/create" className="text-sm text-muted-100 hover:text-text-light transition-colors">Create</Link>
          <Link to="/dashboard" className="text-sm text-muted-100 hover:text-text-light transition-colors">Dashboard</Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-cream-200 transition-colors text-muted-100"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-100 hidden sm:inline">
                <Wallet size={14} className="inline mr-1" />
                {address ? truncate(address) : ''}
              </span>
              <Button size="sm" variant="ghost" onClick={disconnect}>Disconnect</Button>
            </div>
          ) : (
            <Button size="sm" onClick={connect} loading={connecting}>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
