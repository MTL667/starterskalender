import { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

const TERMINAL_STATES = ['COMPLETED', 'ROLLED_BACK']
const BLOCKED_STATES_PREFIX = 'BLOCKED_AT_'

const STEP_LABELS: Record<string, string> = {
  EXECUTING_OOO: 'Setting Out of Office...',
  EXECUTING_LOGIN_BLOCK: 'Disabling user login...',
  EXECUTING_REVOKE_SESSIONS: 'Revoking active sessions...',
  EXECUTING_CALENDAR: 'Cancelling calendar events...',
  EXECUTING_TEAMS_TRANSFER: 'Transferring Teams ownership...',
  EXECUTING_GROUPS: 'Removing from groups...',
  EXECUTING_FORWARDING: 'Removing forwarding rules...',
  EXECUTING_DELEGATES: 'Revoking delegate access...',
  EXECUTING_SIZE_CHECK: 'Checking mailbox size...',
  EXECUTING_CONVERSION: 'Converting to shared mailbox...',
  EXECUTING_LICENSE_REMOVAL: 'Removing license...',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true },
  })

  if (!starter?.entityId) {
    return new Response('Not found', { status: 404 })
  }

  try {
    await requirePermission('mail:offboarding', { entityId: starter.entityId })
  } catch {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let lastState = ''
      let iterations = 0
      const maxIterations = 300 // 10 minutes

      const poll = async () => {
        try {
          const job = await prisma.offboardingJob.findFirst({
            where: { starterId, state: { not: 'ROLLED_BACK' } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, state: true, currentStep: true, error: true, completedAt: true },
          })

          if (!job) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ state: 'NONE' })}\n\n`))
            controller.close()
            return
          }

          if (job.state !== lastState) {
            lastState = job.state
            const payload = {
              state: job.state,
              step: job.currentStep || 0,
              totalSteps: 11,
              message: STEP_LABELS[job.state] || job.state,
              timestamp: new Date().toISOString(),
              error: job.state.startsWith(BLOCKED_STATES_PREFIX) ? job.error : undefined,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          }

          if (TERMINAL_STATES.includes(job.state) || job.state.startsWith(BLOCKED_STATES_PREFIX)) {
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
