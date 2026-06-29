import { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { decryptEntra } from '@/lib/encryption'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true },
  })

  if (!starter || !starter.entityId) {
    return new Response('Not found', { status: 404 })
  }

  try {
    await requirePermission('starters:read', { entityId: starter.entityId })
  } catch {
    return new Response('Unauthorized', { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let lastState = ''
      let iterations = 0
      const maxIterations = 120 // 10 minutes max

      const poll = async () => {
        try {
          const job = await prisma.provisioningJob.findFirst({
            where: { starterId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, state: true, error: true, assignedLicenseType: true, completedAt: true, temporaryPassword: true },
          })

          if (!job) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ state: 'NONE' })}\n\n`))
            controller.close()
            return
          }

          if (job.state !== lastState) {
            lastState = job.state
            const payload: Record<string, unknown> = {
              id: job.id,
              state: job.state,
              error: job.error,
              assignedLicenseType: job.assignedLicenseType,
              completedAt: job.completedAt,
            }
            if (job.state === 'SUCCESS' && job.temporaryPassword) {
              try {
                payload.temporaryPassword = decryptEntra(job.temporaryPassword)
              } catch {}
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          }

          if (['SUCCESS', 'FAILED_AT_LICENSE_CHECK', 'FAILED_AT_USER_CREATION', 'FAILED_AT_LICENSE_ASSIGNMENT', 'FAILED_AT_TAP', 'FAILED_AT_MAILBOX_WAIT'].includes(job.state)) {
            controller.close()
            return
          }

          iterations++
          if (iterations >= maxIterations) {
            controller.close()
            return
          }

          setTimeout(poll, 2000)
        } catch {
          controller.close()
        }
      }

      await poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
