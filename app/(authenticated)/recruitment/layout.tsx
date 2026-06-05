import { redirect } from 'next/navigation'
import { isModuleEnabled } from '@/lib/feature-flags'

export default async function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const enabled = await isModuleEnabled('recruitment')
  if (!enabled) redirect('/')
  return <>{children}</>
}
