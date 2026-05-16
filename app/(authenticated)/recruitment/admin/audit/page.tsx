import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requirePermission } from '@/lib/authz'
import { AuditReportClient } from '@/components/recruitment/admin/audit-report-client'

export default async function AuditReportPage() {
  try {
    await requirePermission('recruitment:admin')
  } catch {
    redirect('/recruitment')
  }

  const t = await getTranslations('recruitment.auditReport')

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>
      <AuditReportClient />
    </div>
  )
}
