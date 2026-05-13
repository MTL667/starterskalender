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

  const devMode = process.env.DEV_MODE === 'true'

  return (
    <SSEProvider>
      <div className="min-h-screen flex flex-col">
        {devMode && (
          <div className="bg-amber-500 text-amber-950 text-center text-sm font-semibold py-1.5 px-4 z-50">
            DEV OMGEVING — Dit is geen productieomgeving
          </div>
        )}
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </SSEProvider>
  )
}

