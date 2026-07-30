import { ThemeProvider } from './lib/theme'
import { Header } from './components/Header'
import { Home } from './pages/Home'
import { AnimatePresence } from 'framer-motion'

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface text-text-light transition-colors duration-300">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            <Home />
          </AnimatePresence>
        </main>
      </div>
    </ThemeProvider>
  )
}
