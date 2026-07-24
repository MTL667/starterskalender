import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { resolveStarterDateChangeRecipients } from '@/lib/starter-notification-recipients'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canMutate = await canMutateStarter(user, id)
    if (!canMutate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: { entityId: true },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Starter niet gevonden' }, { status: 404 })
    }

    if (!starter.entityId) {
      return NextResponse.json({ recipients: [] })
    }

    const { recipients, meta } = await resolveStarterDateChangeRecipients(starter.entityId, user.id)
    return NextResponse.json({
      recipients: recipients.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name || r.email,
      })),
      meta,
    })
  } catch (error) {
    console.error('Error resolving date-change recipients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
