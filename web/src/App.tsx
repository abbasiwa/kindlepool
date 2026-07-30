import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './i18n'
import { ThemeProvider } from './lib/theme'
import { WalletProvider } from './lib/wallet'
import { NotificationProvider } from './lib/notifications'
import { CreatorProvider } from './lib/creator'
import { Header } from './components/Header'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { PoolDetail } from './pages/PoolDetail'
import { CreatePool } from './pages/CreatePool'
import { Dashboard } from './pages/Dashboard'
import { AddFunds } from './pages/AddFunds'
import { CreatorAnalytics } from './pages/CreatorAnalytics'
import { Disputes } from './pages/Disputes'
import { DeveloperPortal } from './pages/DeveloperPortal'
import { Pricing } from './pages/Pricing'
import { Leaderboard } from './pages/Leaderboard'
import { PlatformAnalytics } from './pages/PlatformAnalytics'
import { ToastProvider } from './lib/toast'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="text-center py-24 space-y-4">
      <h1 className="text-4xl font-bold text-text-light">404</h1>
      <p className="text-muted-100">This page doesn't exist.</p>
      <Link to="/" className="inline-block mt-4 text-warm-300 hover:text-warm-400 transition-colors">
        ← Back home
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <NotificationProvider>
            <CreatorProvider>
            <div className="min-h-screen bg-surface text-text-light transition-colors duration-300">
              <Header />
              <main className="max-w-6xl mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/pool/:id" element={<PoolDetail />} />
                  <Route path="/create" element={<CreatePool />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/add-funds" element={<AddFunds />} />
                  <Route path="/creator" element={<CreatorAnalytics />} />
                  <Route path="/disputes" element={<Disputes />} />
                  <Route path="/developers" element={<DeveloperPortal />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/analytics" element={<PlatformAnalytics />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
            </CreatorProvider>
            </NotificationProvider>
          </BrowserRouter>
        </ToastProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
