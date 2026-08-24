"use client"

import * as React from "react"
import { useNotifications } from "@/app/providers/notification-provider"

export function NotificationBell({ className = "" }: { className?: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = React.useState(false)

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-[4px] text-less hover:bg-hover hover:text-foreground transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background elevation-lg ring-1 ring-border rounded-[8px] z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--background-hover)]">
              <h3 className="text-[14px] font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[12px] font-bold text-brand hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  </svg>
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-hover transition-colors ${
                      !notification.read ? "bg-brand-soft" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        notification.type === "success" ? "bg-success" :
                        notification.type === "error" ? "bg-destructive" :
                        notification.type === "investment" ? "bg-primary" :
                        "bg-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{notification.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{formatTime(notification.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function ToastNotification() {
  const { notifications } = useNotifications()
  const [visibleToasts, setVisibleToasts] = React.useState<typeof notifications>([])

  React.useEffect(() => {
    const latest = notifications.find(n => !n.read)
    if (latest && !visibleToasts.find(t => t.id === latest.id)) {
      setVisibleToasts(prev => [...prev.slice(-2), latest])
      
      setTimeout(() => {
        setVisibleToasts(prev => prev.filter(t => t.id !== latest.id))
      }, 5000)
    }
  }, [notifications])

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-background elevation-xl ring-1 ring-border rounded-[8px] p-4 min-w-[280px] max-w-[360px] animate-slide-in"
        >
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              toast.type === "success" ? "bg-success" :
              toast.type === "error" ? "bg-destructive" :
              "bg-primary"
            }`} />
            <div>
              <p className="text-sm font-medium text-foreground">{toast.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}