import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem('kindlepool-theme') as Theme | null
    if (stored) return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    localStorage.setItem('kindlepool-theme', theme)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#FFF8F0' : '#1A1614')
    }
  }, [theme])

  const toggle = () => setThemeState((t) => (t === 'light' ? 'dark' : 'light'))
  const setTheme = (t: Theme) => setThemeState(t)

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
