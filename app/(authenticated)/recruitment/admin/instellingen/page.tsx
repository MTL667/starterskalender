import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requirePermission } from '@/lib/authz'
import { SiteGroupsSection } from '@/components/recruitment/admin/site-groups-section'
import { ShareTemplatesSection } from '@/components/recruitment/admin/share-templates-section'
import { EmailTemplatesSection } from '@/components/recruitment/admin/email-templates-section'
import { RetentionSection } from '@/components/recruitment/admin/retention-section'
import { SlaSection } from '@/components/recruitment/admin/sla-section'

export default async function RecruitmentSettingsPage() {
  try {
    await requirePermission('recruitment:admin')
  } catch {
    redirect('/recruitment')
  }

  const t = await getTranslations('recruitment.settings')

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <EmailTemplatesSection />

      <RetentionSection />

      <SlaSection />

      <SiteGroupsSection />

      <ShareTemplatesSection />
    </div>
  )
}
