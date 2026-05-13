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

  const devWatermarkSvg = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">' +
    '<text x="60" y="40" text-anchor="middle" dominant-baseline="middle" ' +
    'font-family="Arial,sans-serif" font-size="18" font-weight="bold" ' +
    'fill="black" transform="rotate(-30 60 40)">dev</text></svg>'
  )}`

  return (
    <SSEProvider>
      <div className="min-h-screen flex flex-col">
        {devMode && (
          <>
            <div
              className="fixed inset-0 z-40 pointer-events-none select-none"
              style={{
                backgroundImage: `url("${devWatermarkSvg}")`,
                backgroundRepeat: 'repeat',
                opacity: 0.07,
              }}
            />
            <div className="bg-amber-500 text-amber-950 text-center text-sm font-semibold py-1.5 px-4 z-50 relative">
              DEV OMGEVING — Dit is geen productieomgeving
            </div>
          </>
        )}
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </SSEProvider>
  )
}

