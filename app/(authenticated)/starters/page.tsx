import { getCurrentUser } from '@/lib/auth-utils'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { StartersTable } from '@/components/starters/starters-table'

export default async function StartersPage() {
  const t = await getTranslations('starters')
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  const currentYear = new Date().getFullYear()
  
  // Check if user has edit rights (can create starters)
  const canEdit = user.role === 'HR_ADMIN' || 
    user.memberships.some(m => m.canEdit)

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <StartersTable initialYear={currentYear} canEdit={canEdit} />
    </div>
  )
}

