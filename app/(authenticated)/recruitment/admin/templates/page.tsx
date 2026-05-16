import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TemplateList } from '@/components/recruitment/template/template-list'

export default async function TemplatesAdminPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'recruitment:admin')) {
    redirect('/recruitment/vacatures')
  }

  const t = await getTranslations('recruitment')

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('templates.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('templates.description')}</p>
      </div>
      <TemplateList />
    </div>
  )
}
