import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { redirect } from 'next/navigation'
import { NewVacancyFlow } from './client'

export default async function NieuweVacaturePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'vacancy:create')) {
    redirect('/recruitment/vacatures')
  }

  return <NewVacancyFlow />
}
