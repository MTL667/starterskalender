import { redirect } from 'next/navigation'
import { isModuleEnabled } from '@/lib/feature-flags'

export default async function MaterialenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const enabled = await isModuleEnabled('materials')
  if (!enabled) redirect('/')
  return <>{children}</>
}
