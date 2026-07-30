import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import { WalletProvider } from './lib/wallet'
import { Header } from './components/Header'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { PoolDetail } from './pages/PoolDetail'
import { CreatePool } from './pages/CreatePool'
import { Dashboard } from './pages/Dashboard'
import { ToastProvider } from './lib/toast'

export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <ToastProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-surface text-text-light transition-colors duration-300">
              <Header />
              <main className="max-w-6xl mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/pool/:id" element={<PoolDetail />} />
                  <Route path="/create" element={<CreatePool />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </ToastProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
