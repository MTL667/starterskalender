import { getCurrentUser } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { CalendarView } from '@/components/kalender/calendar-view'

export default async function KalenderPage() {
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
        <h1 className="text-3xl font-bold mb-2">Starterskalender</h1>
        <p className="text-muted-foreground">
          Overzicht van alle starters per week
        </p>
      </div>

      <CalendarView initialYear={currentYear} canEdit={canEdit} />
    </div>
  )
}

