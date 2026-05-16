import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { redirect } from 'next/navigation'
import { TemplateForm } from '@/components/recruitment/template/template-form'

export default async function NieuwTemplatePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'recruitment:admin')) {
    redirect('/recruitment/vacatures')
  }

  return <TemplateForm />
}
