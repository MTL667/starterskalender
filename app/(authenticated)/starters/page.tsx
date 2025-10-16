import { getCurrentUser } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { StartersTable } from '@/components/starters/starters-table'

export default async function StartersPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Starters</h1>
        <p className="text-muted-foreground">
          Overzicht van alle starters
        </p>
      </div>

      <StartersTable initialYear={currentYear} />
    </div>
  )
}

