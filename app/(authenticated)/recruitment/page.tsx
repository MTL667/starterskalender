import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Briefcase, Plus, FileText, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardMetrics } from '@/components/recruitment/dashboard/dashboard-metrics'

export default async function RecruitmentPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'recruitment:read')) {
    redirect('/dashboard')
  }

  const isAdmin = can(authUser, 'recruitment:admin')
  const t = await getTranslations('recruitment')

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">{t('overview')}</p>
        </div>
        {can(authUser, 'vacancy:create') && (
          <Link href="/recruitment/vacatures/nieuw">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('newVacancy')}
            </Button>
          </Link>
        )}
      </div>

      <DashboardMetrics />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/recruitment/vacatures" className="block group">
          <Card className="h-full hover:shadow-md transition-all hover:border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{t('vacancies')}</h2>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm text-muted-foreground">{t('vacanciesDescription')}</p>
            </CardContent>
          </Card>
        </Link>
        {isAdmin && (
          <Link href="/recruitment/admin/audit" className="block group">
            <Card className="h-full hover:shadow-md transition-all hover:border-primary/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{t('dashboard.auditReports')}</h2>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground">{t('dashboard.auditReportsDesc')}</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
