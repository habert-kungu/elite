"use client"

import * as React from "react"
import Pusher from "pusher-js"
import { invalidateCache } from "@/lib/use-cached-fetch"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  addNotification: (notification: Notification) => void
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children, userId, isAdmin }: { children: React.ReactNode; userId?: string; isAdmin?: boolean }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [isConnected, setIsConnected] = React.useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const addNotification = React.useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50))
  }, [])

  const markAsRead = React.useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllAsRead = React.useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  React.useEffect(() => {
    if (!userId && !isAdmin) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "your-key", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
    })

    const channels: string[] = []
    if (userId) channels.push(`user-${userId}`)
    if (isAdmin) channels.push("admin-notifications")

    const subscribedChannels = channels.map(channelName => {
      const channel = pusher.subscribe(channelName)
      
      channel.bind("investment:created", (data: any) => {
        addNotification({
          id: `inv-created-${Date.now()}`,
          type: "investment",
          title: "New Investment",
          message: data.message || `New ${data.pool} investment of $${data.amount}`,
          timestamp: new Date(),
          read: false,
        })
      })

      channel.bind("investment:approved", (data: any) => {
        invalidateCache("/api/user/")
        addNotification({
          id: `inv-approved-${Date.now()}`,
          type: "success",
          title: "Investment Approved",
          message: data.message,
          timestamp: new Date(),
          read: false,
        })
      })

      channel.bind("investment:rejected", (data: any) => {
        invalidateCache("/api/user/")
        addNotification({
          id: `inv-rejected-${Date.now()}`,
          type: "error",
          title: "Investment Rejected",
          message: data.message,
          timestamp: new Date(),
          read: false,
        })
      })

      channel.bind("investment:updated", (data: any) => {
        invalidateCache("/api/user/")
        addNotification({
          id: `inv-updated-${Date.now()}`,
          type: "investment",
          title: "Plan updated",
          message: data.message || "Your investment plan was adjusted by the admin.",
          timestamp: new Date(),
          read: false,
        })
      })

      channel.bind("cycle:completed", (data: any) => {
        invalidateCache("/api/user/")
        addNotification({
          id: `cycle-completed-${Date.now()}`,
          type: "success",
          title: "Cycle Completed",
          message: `Your ${data.pool} cycle completed! $${data.returnAmount} is now available.`,
          timestamp: new Date(),
          read: false,
        })
      })

      channel.bind("withdrawal:processed", (data: any) => {
        addNotification({
          id: `withdrawal-${Date.now()}`,
          type: "success",
          title: "Withdrawal Processed",
          message: `Your withdrawal of $${data.amount} has been processed.`,
          timestamp: new Date(),
          read: false,
        })
      })

      return channel
    })

    setIsConnected(true)

    return () => {
      subscribedChannels.forEach(ch => ch.unbind_all().unsubscribe())
      pusher.disconnect()
    }
  }, [userId, isAdmin, addNotification])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = React.useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider")
  }
  return context
}