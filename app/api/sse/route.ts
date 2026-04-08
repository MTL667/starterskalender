import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { eventBus, type SSEEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { memberships: { select: { entityId: true } } },
  })

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const role = user.role
  const isGlobalAccess = role === 'HR_ADMIN' || role === 'GLOBAL_VIEWER'

  let entityIds: string[]
  if (isGlobalAccess) {
    const entities = await prisma.entity.findMany({ select: { id: true } })
    entityIds = entities.map(e => e.id)
  } else {
    entityIds = user.memberships.map(m => m.entityId)
  }

  if (entityIds.length === 0) {
    entityIds = ['__none__']
  }

  let cleanupFn: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          cleanup()
        }
      }

      send(`:ok\nretry: 3000\n\n`)

      const clientId = eventBus.subscribe(entityIds, (event: SSEEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
      })

      const heartbeat = setInterval(() => {
        send(`:heartbeat\n\n`)
      }, 30_000)

      function cleanup() {
        clearInterval(heartbeat)
        eventBus.unsubscribe(clientId)
      }

      cleanupFn = cleanup
    },
    cancel() {
      cleanupFn?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
