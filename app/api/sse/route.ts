import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { eventBus, type SSEEvent } from '@/lib/events'
import { ROLE_ASSIGNMENTS_INCLUDE, toAuthorizedUser, visibleEntityIds } from '@/lib/authz'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      memberships: { select: { entityId: true } },
      ...ROLE_ASSIGNMENTS_INCLUDE,
    },
  })

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const authUser = toAuthorizedUser(user)
  const starterScope = visibleEntityIds(authUser, 'starters:read')
  const recruitmentScope = visibleEntityIds(authUser, 'recruitment:read')

  let entityIds: string[]
  if (starterScope === 'ALL' || recruitmentScope === 'ALL') {
    const entities = await prisma.entity.findMany({ select: { id: true } })
    entityIds = entities.map(e => e.id)
  } else {
    const merged = new Set([...starterScope, ...recruitmentScope])
    entityIds = [...merged]
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
