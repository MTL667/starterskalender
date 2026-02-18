import { getCurrentUser } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { YTDStats } from '@/components/dashboard/ytd-stats'
import { RecentStarters } from '@/components/dashboard/recent-starters'
import { MyTasks } from '@/components/dashboard/my-tasks'
import { MonthlyCharts } from '@/components/dashboard/monthly-charts'
import { EntityMonthlyCharts } from '@/components/dashboard/entity-monthly-charts'
import Link from 'next/link'
import { Calendar, Users, Settings } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  const t = await getTranslations('dashboard')
  const currentYear = new Date().getFullYear()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('welcome', { name: user.name || user.email })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/kalender">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-lg">{t('calendarTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('calendarDescription')}
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/starters">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Users className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-lg">{t('startersTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('startersDescription')}
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {user.role === 'HR_ADMIN' && (
          <Link href="/admin">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Settings className="h-5 w-5 mr-2 text-primary" />
                <CardTitle className="text-lg">{t('adminTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('adminDescription')}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Aankomende Starters & Mijn Taken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RecentStarters year={currentYear} />
        <MyTasks />
      </div>

      {/* YTD Statistics */}
      <YTDStats year={currentYear} />

      {/* Monthly Charts */}
      <div className="mt-8">
        <MonthlyCharts year={currentYear} />
      </div>

      {/* Entity Monthly Charts */}
      <div className="mt-8">
        <EntityMonthlyCharts year={currentYear} />
      </div>
    </div>
  )
}

