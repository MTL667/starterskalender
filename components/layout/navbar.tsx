'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Calendar, LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="font-bold text-xl">
            Starterskalender
          </Link>

          <div className="hidden md:flex space-x-1">
            <Link href="/dashboard">
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>

            <Link href="/kalender">
              <Button
                variant={isActive('/kalender') ? 'default' : 'ghost'}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Kalender
              </Button>
            </Link>

            <Link href="/starters">
              <Button
                variant={isActive('/starters') ? 'default' : 'ghost'}
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Starters
              </Button>
            </Link>

            {session?.user?.role === 'HR_ADMIN' && (
              <Link href="/admin">
                <Button
                  variant={isActive('/admin') ? 'default' : 'ghost'}
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {session?.user?.name || session?.user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </div>
    </nav>
  )
}

