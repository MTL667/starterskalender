import { getCurrentUser } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { YTDStats } from '@/components/dashboard/ytd-stats'
import { RecentStarters } from '@/components/dashboard/recent-starters'
import { QuickActions } from '@/components/dashboard/quick-actions'
import Link from 'next/link'
import { Calendar, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welkom, {user.name || user.email}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/kalender">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-lg">Kalender</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Bekijk de starterskalender
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/starters">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Users className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-lg">Starters</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Beheer alle starters
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {user.role === 'HR_ADMIN' && (
          <Link href="/admin">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Settings className="h-5 w-5 mr-2 text-primary" />
                <CardTitle className="text-lg">Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Beheer instellingen
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* YTD Statistics */}
      <YTDStats year={currentYear} />

      {/* Recent Starters */}
      <div className="mt-8">
        <RecentStarters year={currentYear} />
      </div>
    </div>
  )
}

