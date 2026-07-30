import { useState, useEffect } from 'react'
import { Button, Card } from './ui'
import { useToast } from '../lib/toast'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff } from 'lucide-react'

export function PushNotificationPrompt() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [subscribed, setSubscribed] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const hasSw = 'serviceWorker' in navigator
    const hasPush = 'PushManager' in window
    const hasNotif = 'Notification' in window
    setSupported(hasSw && hasPush && hasNotif)
  }, [])

  const ensurePermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') {
      toast('Notifications are blocked. Enable them in browser settings.', 'error')
      return false
    }
    const result = await Notification.requestPermission()
    return result === 'granted'
  }

  const subscribe = async () => {
    if (!supported) {
      toast('Push notifications not supported in this browser.', 'error')
      return
    }
    const permitted = await ensurePermission()
    if (!permitted) return

    try {
      const reg = await navigator.serviceWorker.ready
      const existingSub = await reg.pushManager.getSubscription()
      if (existingSub) {
        setSubscribed(true)
        toast('Already subscribed.', 'info')
        return
      }
      await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BGEwAAcBAAoA' as any,
      })
      setSubscribed(true)
      toast('Push notifications enabled!', 'success')
    } catch {
      toast('Failed to enable. Try again.', 'error')
    }
  }

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      setSubscribed(false)
      toast('Push notifications disabled.', 'info')
    } catch {
      toast('Failed to disable.', 'error')
    }
  }

  if (!supported) return null

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <Bell className="text-warm-300" size={20} />
        <div>
          <h4 className="font-medium text-sm">{t('notifications.title')}</h4>
          <p className="text-xs text-muted-100">Get notified about pool activity</p>
        </div>
      </div>
      <Button
        variant={subscribed ? 'secondary' : 'primary'}
        size="sm"
        onClick={subscribed ? unsubscribe : subscribe}
      >
        {subscribed ? <><BellOff size={14} /> Disable</> : <><Bell size={14} /> Enable</>}
      </Button>
    </Card>
  )
}
