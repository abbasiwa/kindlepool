import { useEffect, useState } from 'react'
import type { PoolData } from '@kindlepool/sdk'

interface EmbedWidgetProps {
  poolId: number
  apiUrl?: string
  theme?: 'light' | 'dark'
  accentColor?: string
}

export function KindlePoolWidget({ poolId, apiUrl = 'https://api.kindlepool.dev/v1', theme = 'light', accentColor = '#C4956A' }: EmbedWidgetProps) {
  const [pool, setPool] = useState<PoolData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${apiUrl}/pools/${poolId}`)
      .then((r) => r.json())
      .then((data) => setPool(data))
      .catch(() => setPool(null))
      .finally(() => setLoading(false))
  }, [poolId, apiUrl])

  if (loading) {
    return (
      <div style={{
        padding: '16px', borderRadius: '12px', background: theme === 'dark' ? '#2D2520' : '#FFF8F0',
        border: '1px solid', borderColor: theme === 'dark' ? '#5A4D40' : '#E8D5C4',
        fontFamily: 'system-ui, sans-serif', color: theme === 'dark' ? '#E8DDD0' : '#2D2520',
      }}>
        Loading...
      </div>
    )
  }

  if (!pool) {
    return (
      <div style={{
        padding: '16px', borderRadius: '12px', background: theme === 'dark' ? '#2D2520' : '#FFF8F0',
        border: '1px solid', borderColor: theme === 'dark' ? '#5A4D40' : '#E8D5C4',
        fontFamily: 'system-ui, sans-serif', color: theme === 'dark' ? '#E8DDD0' : '#2D2520',
      }}>
        Pool not found
      </div>
    )
  }

  const pct = Number(pool.goal) > 0 ? Math.min((Number(pool.total_deposited) / Number(pool.goal)) * 100, 100) : 0

  return (
    <div style={{
      padding: '16px', borderRadius: '12px', background: theme === 'dark' ? '#2D2520' : '#FFF8F0',
      border: '1px solid', borderColor: theme === 'dark' ? '#5A4D40' : '#E8D5C4',
      fontFamily: 'system-ui, sans-serif', color: theme === 'dark' ? '#E8DDD0' : '#2D2520',
      maxWidth: '360px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{pool.id > 0 ? `Pool #${pool.id}` : 'KindlePool'}</div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>{pool.status}</div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
          background: theme === 'dark' ? '#4A3D32' : '#FAF0E6', color: theme === 'dark' ? '#E8DDD0' : '#6B5D50',
          textTransform: 'capitalize',
        }}>{pool.status}</span>
      </div>

      <div style={{
        height: '6px', background: theme === 'dark' ? '#4A3D32' : '#F0E6D8',
        borderRadius: '999px', overflow: 'hidden', marginBottom: '8px',
      }}>
        <div style={{ height: '100%', width: `${pct}%`, background: accentColor, borderRadius: '999px', transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px' }}>
        <span>{pool.total_deposited} / {pool.goal} USDC</span>
        <span style={{ opacity: 0.6 }}>{pool.total_supporters} supporters</span>
      </div>

      <a
        href={`https://kindlepool.app/pool/${poolId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', textAlign: 'center', padding: '8px 16px', borderRadius: '8px',
          background: accentColor, color: '#FFF', textDecoration: 'none', fontWeight: 600,
          fontSize: '13px', transition: 'opacity 0.2s',
        }}
        onMouseOver={(e) => (e.target as HTMLAnchorElement).style.opacity = '0.9'}
        onMouseOut={(e) => (e.target as HTMLAnchorElement).style.opacity = '1'}
      >
        Fund This Pool
      </a>
    </div>
  )
}

// Web component wrapper for use on any site
if (typeof window !== 'undefined' && !customElements.get('kindlepool-pool')) {
  customElements.define('kindlepool-pool', class extends HTMLElement {
    connectedCallback() {
      const id = parseInt(this.getAttribute('pool-id') ?? '0', 10)
      const theme = (this.getAttribute('theme') ?? 'light') as 'light' | 'dark'
      const accent = this.getAttribute('accent') ?? '#C4956A'
      if (id > 0) {
        const root = document.createElement('div')
        this.appendChild(root)
        // In a real build, render React here
        root.innerHTML = `<div style="padding:16px;border-radius:12px;background:${theme === 'dark' ? '#2D2520' : '#FFF8F0'};border:1px solid ${theme === 'dark' ? '#5A4D40' : '#E8D5C4'};font-family:system-ui,sans-serif;max-width:360px">Loading pool #${id}...</div>`
        fetch(`https://api.kindlepool.dev/v1/pools/${id}`)
          .then((r) => r.json())
          .then((pool) => {
            const pct = Number(pool.goal) > 0 ? Math.min((Number(pool.total_deposited) / Number(pool.goal)) * 100, 100) : 0
            root.innerHTML = `
              <div style="padding:16px;border-radius:12px;background:${theme === 'dark' ? '#2D2520' : '#FFF8F0'};border:1px solid ${theme === 'dark' ? '#5A4D40' : '#E8D5C4'};font-family:system-ui,sans-serif;max-width:360px;color:${theme === 'dark' ? '#E8DDD0' : '#2D2520'}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                  <div><div style="font-weight:700;font-size:14px">Pool #${pool.id}</div><div style="font-size:12px;opacity:0.6">${pool.status}</div></div>
                  <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${theme === 'dark' ? '#4A3D32' : '#FAF0E6'};color:${theme === 'dark' ? '#E8DDD0' : '#6B5D50'};text-transform:capitalize">${pool.status}</span>
                </div>
                <div style="height:6px;background:${theme === 'dark' ? '#4A3D32' : '#F0E6D8'};border-radius:999px;overflow:hidden;margin-bottom:8px">
                  <div style="height:100%;width:${pct}%;background:${accent};border-radius:999px;transition:width 0.5s ease"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px">
                  <span>${pool.total_deposited} / ${pool.goal} USDC</span>
                  <span style="opacity:0.6">${pool.total_supporters} supporters</span>
                </div>
                <a href="https://kindlepool.app/pool/${poolId}" target="_blank" style="display:block;text-align:center;padding:8px 16px;border-radius:8px;background:${accent};color:#fff;text-decoration:none;font-weight:600;font-size:13px">Fund This Pool</a>
              </div>`
          })
      }
    }
  })
}
