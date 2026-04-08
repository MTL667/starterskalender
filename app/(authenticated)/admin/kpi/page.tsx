import { requireAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { KpiDashboard } from '@/components/admin/kpi-dashboard'

export default async function KpiPage() {
  const user = await requireAdmin().catch(() => null)

  if (!user) {
    redirect('/dashboard')
  }

  return <KpiDashboard />
}
