import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Briefcase, Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        <Link href="/recruitment/vacatures" className="block">
          <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">{t('vacancies')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('vacanciesDescription')}</p>
          </div>
        </Link>
        {isAdmin && (
          <Link href="/recruitment/admin/audit" className="block">
            <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">{t('dashboard.auditReports')}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t('dashboard.auditReportsDesc')}</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
