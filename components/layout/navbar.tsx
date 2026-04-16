'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Calendar, LayoutDashboard, Users, Settings, LogOut, User, CheckSquare, Wifi, WifiOff, Package, Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/layout/notification-bell'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { useSSEStatus } from '@/components/providers/sse-provider'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const sseStatus = useSSEStatus()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = useTranslations('navbar')

  const isActive = (path: string) => pathname === path

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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

  const navLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard'), show: true },
    { href: '/kalender', icon: Calendar, label: t('calendar'), show: true },
    { href: '/starters', icon: Users, label: t('starters'), show: true },
    { href: '/taken', icon: CheckSquare, label: t('tasks'), show: true },
    { href: '/materialen', icon: Package, label: t('materials'), show: ((session?.user as any)?.permissions ?? []).includes('MATERIAL_MANAGER') },
    { href: '/admin', icon: Settings, label: t('admin'), show: session?.user?.role === 'HR_ADMIN' },
  ]

  return (
    <nav className="border-b bg-background relative">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden p-1.5"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link href="/dashboard" className="flex items-center">
            {logoLoading ? (
              <span className="font-bold text-xl">{t('appTitle')}</span>
            ) : logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-10 object-contain rounded-lg"
              />
            ) : (
              <span className="font-bold text-xl">{t('appTitle')}</span>
            )}
          </Link>

          <div className="hidden md:flex space-x-1">
            {navLinks.filter(l => l.show).map(link => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive(link.href) ? 'default' : 'ghost'}
                  size="sm"
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-sm text-muted-foreground hidden sm:block">
            {session?.user?.name || session?.user?.email}
          </div>
          {sseStatus === 'disconnected' && (
            <span title="Real-time verbinding verbroken"><WifiOff className="h-4 w-4 text-orange-500" /></span>
          )}
          {sseStatus === 'reconnecting' && (
            <span title="Opnieuw verbinden..."><Wifi className="h-4 w-4 text-orange-400 animate-pulse" /></span>
          )}
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-sm absolute left-0 right-0 top-16 z-50 shadow-lg">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navLinks.filter(l => l.show).map(link => (
              <Link key={link.href} href={link.href} className="block">
                <Button
                  variant={isActive(link.href) ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                >
                  <link.icon className="h-4 w-4 mr-3" />
                  {link.label}
                </Button>
              </Link>
            ))}
            <div className="border-t pt-2 mt-2">
              <Link href="/profiel" className="block">
                <Button
                  variant={isActive('/profiel') ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                >
                  <User className="h-4 w-4 mr-3" />
                  {t('profile')}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="h-4 w-4 mr-3" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

