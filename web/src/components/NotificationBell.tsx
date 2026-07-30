import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../lib/notifications'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markAsRead(n.id)
    navigate(`/pool/${n.poolId}`)
    setOpen(false)
  }

  const iconMap: Record<string, string> = {
    deposit: '💰',
    goal_reached: '🎯',
    work_submitted: '📤',
    vote_cast: '🗳️',
    pool_paid: '✅',
    pool_refunded: '🔄',
    pool_expired: '⏰',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-cream-200 transition-colors text-muted-100"
        aria-label={t('notifications.title')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-warm-300 text-cream-50 text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-2xl shadow-modal border border-cream-400/50 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-cream-400/30">
              <h3 className="font-bold text-sm">{t('notifications.title')}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-warm-300 hover:text-warm-400 flex items-center gap-1">
                  <CheckCheck size={14} /> {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-100">{t('notifications.empty')}</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cream-200 transition-colors ${
                      !n.read ? 'bg-cream-100' : ''
                    }`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{iconMap[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-medium' : ''}`}>
                        {t(`notifications.items.${n.type}`, { amount: n.amount, pool: n.poolTitle })}
                      </p>
                      <p className="text-xs text-muted-100 mt-0.5">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-warm-300 shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return rtf.format(0, 'minute')
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  return rtf.format(-days, 'day')
}
