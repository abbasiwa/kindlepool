import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface Notification {
  id: number
  type: 'deposit' | 'goal_reached' | 'work_submitted' | 'vote_cast' | 'pool_paid' | 'pool_refunded' | 'pool_expired'
  poolId: number
  poolTitle: string
  amount?: string
  read: boolean
  createdAt: number
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: number) => void
  markAllRead: () => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllRead: () => {},
  clearNotifications: () => {},
})

let notifId = 0

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const id = ++notifId
    setNotifications((prev) => [{ ...n, id, read: false, createdAt: Date.now() }, ...prev])
  }, [])

  const markAsRead = useCallback((id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
