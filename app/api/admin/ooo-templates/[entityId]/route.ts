import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const user = await requirePermission('mail:offboarding')
    const { entityId } = await params

    if (!can(user, 'mail:offboarding', { entityId })) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'No access to this entity' },
        { status: 403 }
      )
    }

    const templates = await prisma.oooTemplate.findMany({
      where: { entityId },
      include: {
        jobRole: { select: { id: true, title: true } },
      },
      orderBy: [{ jobRoleId: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: error.message },
        { status: 403 }
      )
    }
    console.error('[ooo-templates] GET error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch OOO templates' },
      { status: 500 }
    )
  }
}
