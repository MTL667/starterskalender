import { Navbar } from '@/components/layout/navbar'
import { SSEProvider } from '@/components/providers/sse-provider'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <SSEProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </SSEProvider>
  )
}

