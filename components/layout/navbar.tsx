'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Calendar, LayoutDashboard, Users, Settings, LogOut, User, CheckSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/layout/notification-bell'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(true)
  const t = useTranslations('navbar')

  const isActive = (path: string) => pathname === path

  useEffect(() => {
    // Load logo from system settings
    fetch('/api/system/settings')
      .then(res => {
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`)
        }
        return res.json()
      })
      .then(settings => {
        // Only set logo if no error and logo_url exists
        if (!settings.error && settings.logo_url) {
          setLogoUrl(settings.logo_url)
        } else {
          setLogoUrl(null)
        }
      })
      .catch(error => {
        console.error('Error loading logo (will use text fallback):', error)
        setLogoUrl(null)
      })
      .finally(() => {
        setLogoLoading(false)
      })
  }, [])

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="flex items-center">
            {logoLoading ? (
              <span className="font-bold text-xl">{t('appTitle')}</span>
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-10 object-contain"
              />
            ) : (
              <span className="font-bold text-xl">{t('appTitle')}</span>
            )}
          </Link>

          <div className="hidden md:flex space-x-1">
            <Link href="/dashboard">
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                {t('dashboard')}
              </Button>
            </Link>

            <Link href="/kalender">
              <Button
                variant={isActive('/kalender') ? 'default' : 'ghost'}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {t('calendar')}
              </Button>
            </Link>

            <Link href="/starters">
              <Button
                variant={isActive('/starters') ? 'default' : 'ghost'}
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                {t('starters')}
              </Button>
            </Link>

            <Link href="/taken">
              <Button
                variant={isActive('/taken') ? 'default' : 'ghost'}
                size="sm"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {t('tasks')}
              </Button>
            </Link>

            {session?.user?.role === 'HR_ADMIN' && (
              <Link href="/admin">
                <Button
                  variant={isActive('/admin') ? 'default' : 'ghost'}
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t('admin')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-sm text-muted-foreground hidden sm:block">
            {session?.user?.name || session?.user?.email}
          </div>
          <NotificationBell />
          <Link href="/profiel">
            <Button
              variant={isActive('/profiel') ? 'default' : 'ghost'}
              size="sm"
            >
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('profile')}</span>
            </Button>
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}

