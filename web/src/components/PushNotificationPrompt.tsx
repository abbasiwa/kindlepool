import { useState } from 'react'
import { Button, Card } from './ui'
import { useToast } from '../lib/toast'
import { Bell, BellOff } from 'lucide-react'

const VAPID_PUBLIC_KEY = ''

export function PushNotificationPrompt() {
  const { toast } = useToast()
  const [subscribed, setSubscribed] = useState(false)

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast('Push notifications not supported in this browser.', 'error')
      return
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY || 'BGEwAAcBAAoA') as any,
      })

      // Send subscription to server
      await fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      setSubscribed(true)
      toast('Push notifications enabled!', 'success')
    } catch (err: any) {
      toast('Failed to enable push notifications.', 'error')
    }
  }

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
      }
      setSubscribed(false)
      toast('Push notifications disabled.', 'info')
    } catch {
      toast('Failed to disable.', 'error')
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <Bell className="text-warm-300" size={20} />
        <div>
          <h4 className="font-medium text-sm">Push Notifications</h4>
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
