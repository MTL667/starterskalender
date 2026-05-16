import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { redirect } from 'next/navigation'
import { VacancyEditClient } from './client'

export default async function BewerkenVacaturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'vacancy:edit')) {
    redirect('/recruitment/vacatures')
  }

  return <VacancyEditClient vacancyId={id} />
}
