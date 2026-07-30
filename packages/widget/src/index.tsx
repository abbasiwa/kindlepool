import { useEffect, useState } from 'react'

interface PoolDisplayData {
  id: number
  status: string
  goal: string
  total_deposited: string
  total_supporters: number
}

interface EmbedWidgetProps {
  poolId: number
  apiUrl?: string
  theme?: 'light' | 'dark'
  accentColor?: string
}

function sanitizeString(s: string): string {
  return s.replace(/[<>"']/g, '').slice(0, 100)
}

export function KindlePoolWidget({ poolId, apiUrl = 'https://api.kindlepool.dev', theme = 'light', accentColor = '#C4956A' }: EmbedWidgetProps) {
  const [pool, setPool] = useState<PoolDisplayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetch(`${apiUrl}/api/v1/pools/${poolId}`)
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then((data) => { if (!cancelled) setPool(data) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [poolId, apiUrl])

  if (loading) {
    return <div style={containerStyle(theme)}>Loading...</div>
  }

  if (error || !pool) {
    return <div style={containerStyle(theme)}>Pool not found</div>
  }

  const pct = Number(pool.goal) > 0 ? Math.min((Number(pool.total_deposited) / Number(pool.goal)) * 100, 100) : 0

  return (
    <div style={{ ...containerStyle(theme), maxWidth: '360px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Pool #{sanitizeString(String(pool.id))}</div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>{sanitizeString(pool.status)}</div>
        </div>
      </div>
      <div style={{ height: '6px', background: theme === 'dark' ? '#4A3D32' : '#F0E6D8', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: accentColor, borderRadius: '999px', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px' }}>
        <span>{sanitizeString(pool.total_deposited)} / {sanitizeString(pool.goal)} USDC</span>
        <span style={{ opacity: 0.6 }}>{pool.total_supporters} supporters</span>
      </div>
      <a href={`https://kindlepool.app/pool/${poolId}`} target="_blank" rel="noopener noreferrer"
        style={{ display: 'block', textAlign: 'center', padding: '8px 16px', borderRadius: '8px', background: accentColor, color: '#FFF', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}>
        Fund This Pool
      </a>
    </div>
  )
}

function containerStyle(theme: 'light' | 'dark'): React.CSSProperties {
  return {
    padding: '16px', borderRadius: '12px',
    background: theme === 'dark' ? '#2D2520' : '#FFF8F0',
    border: `1px solid ${theme === 'dark' ? '#5A4D40' : '#E8D5C4'}`,
    fontFamily: 'system-ui, sans-serif',
    color: theme === 'dark' ? '#E8DDD0' : '#2D2520',
  }
}

// Web component wrapper for use on any site
if (typeof window !== 'undefined' && !customElements.get('kindlepool-pool')) {
  customElements.define('kindlepool-pool', class extends HTMLElement {
    connectedCallback() {
      const id = parseInt(this.getAttribute('pool-id') ?? '0', 10)
      const theme = (this.getAttribute('theme') ?? 'light') as 'light' | 'dark'
      const accent = this.getAttribute('accent') ?? '#C4956A'
      if (id <= 0) {
        this.textContent = 'Invalid pool ID'
        return
      }

      const bg = theme === 'dark' ? '#2D2520' : '#FFF8F0'
      const border = theme === 'dark' ? '#5A4D40' : '#E8D5C4'
      const textColor = theme === 'dark' ? '#E8DDD0' : '#2D2520'
      const trackBg = theme === 'dark' ? '#4A3D32' : '#F0E6D8'

      const root = document.createElement('div')
      root.style.cssText = `padding:16px;border-radius:12px;background:${bg};border:1px solid ${border};font-family:system-ui,sans-serif;max-width:360px;color:${textColor}`
      root.textContent = `Loading pool #${id}...`
      this.appendChild(root)

      fetch(`https://api.kindlepool.dev/api/v1/pools/${id}`)
        .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
        .then((pool) => {
          const pct = Number(pool.goal) > 0 ? Math.min((Number(pool.total_deposited) / Number(pool.goal)) * 100, 100) : 0
          // Use textContent/appendChild for safety instead of innerHTML
          root.textContent = ''
          root.style.padding = '16px'
          const statusEl = document.createElement('span')
          statusEl.style.cssText = `padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${theme === 'dark' ? '#4A3D32' : '#FAF0E6'};color:${theme === 'dark' ? '#E8DDD0' : '#6B5D50'};text-transform:capitalize`
          statusEl.textContent = pool.status ?? 'unknown'
          root.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px"><div><strong>Pool #${pool.id}</strong><br><span style="font-size:12px;opacity:0.6">${pool.status}</span></div></div><div style="height:6px;background:${trackBg};border-radius:999px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:${pct}%;background:${accent};border-radius:999px"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px"><span>${pool.total_deposited}/${pool.goal} USDC</span><span style="opacity:0.6">${pool.total_supporters} supporters</span></div><a href="https://kindlepool.app/pool/${id}" target="_blank" style="display:block;text-align:center;padding:8px;border-radius:8px;background:${accent};color:#fff;text-decoration:none;font-size:13px;font-weight:600">Fund This Pool</a>`
        })
        .catch(() => {
          root.textContent = 'Pool not found'
        })
    }
  })
}
