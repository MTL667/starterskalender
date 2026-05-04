import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { getCurrentAuthorizedUser, can } from '@/lib/authz'
import { assignInspectorNumber } from '@/lib/inspector-number'

export async function POST(
  request: NextRequest,
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

    const authUser = await getCurrentAuthorizedUser()
    if (!can(authUser, 'starters:write:inspectornumber')) {
      return NextResponse.json({ error: 'Geen rechten om inspecteurnummer toe te kennen' }, { status: 403 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      select: { entityId: true, inspectorNumber: true },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Starter niet gevonden' }, { status: 404 })
    }

    if (starter.inspectorNumber !== null) {
      return NextResponse.json({ error: 'Starter heeft al een inspecteurnummer' }, { status: 400 })
    }

    if (!starter.entityId) {
      return NextResponse.json({ error: 'Starter heeft geen entiteit' }, { status: 400 })
    }

    const number = await assignInspectorNumber(id, starter.entityId, user.id)

    return NextResponse.json({ inspectorNumber: number })
  } catch (error) {
    console.error('Error assigning inspector number:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
