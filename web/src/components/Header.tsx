import { useTheme } from '../lib/theme'
import { Button } from './ui'
import { Moon, Sun } from 'lucide-react'

export function Header() {
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-cream-400/30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-warm-300 to-warm-200 flex items-center justify-center">
            <span className="text-cream-50 text-sm font-bold">K</span>
          </div>
          <span className="font-bold text-lg text-text-light">KindlePool</span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          <a href="/explore" className="text-sm text-muted-100 hover:text-text-light transition-colors">Explore</a>
          <a href="/create" className="text-sm text-muted-100 hover:text-text-light transition-colors">Create</a>
          <a href="/dashboard" className="text-sm text-muted-100 hover:text-text-light transition-colors">Dashboard</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-cream-200 transition-colors text-muted-100"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Button size="sm">Connect Wallet</Button>
        </div>
      </div>
    </header>
  )
}
