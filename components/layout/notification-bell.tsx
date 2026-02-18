'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  taskId?: string | null
  starterId?: string | null
  linkUrl?: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const t = useTranslations('notifications')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      })
      
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        )
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    // Navigate to link
    if (notification.linkUrl) {
      router.push(notification.linkUrl)
      setOpen(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    // You can customize icons based on type
    return '📋'
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return t('justNow')
    if (seconds < 3600) return t('minutesAgo', { n: Math.floor(seconds / 60) })
    if (seconds < 86400) return t('hoursAgo', { n: Math.floor(seconds / 3600) })
    if (seconds < 604800) return t('daysAgo', { n: Math.floor(seconds / 86400) })
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] max-h-[600px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">{t('title')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              {t('markAllRead')}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            {tCommon('loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('noNotifications')}</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'flex items-start p-4 cursor-pointer hover:bg-accent transition-colors border-b last:border-0',
                  !notification.isRead && 'bg-blue-50 dark:bg-blue-950/20'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  router.push('/taken')
                  setOpen(false)
                }}
              >
                {t('viewAllTasks')}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

