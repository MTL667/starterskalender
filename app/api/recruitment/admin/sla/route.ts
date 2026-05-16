import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

const slaSchema = z.object({
  slaWarningDays: z.number().int().min(1).max(90),
  slaExceededDays: z.number().int().min(1).max(180),
})

export async function GET() {
  try {
    const user = await requirePermission('recruitment:admin')
    const entityIds = visibleEntityIds(user, 'recruitment:admin')

    const entities = await prisma.entity.findMany({
      where: entityIds === 'ALL' ? {} : { id: { in: entityIds } },
      select: {
        id: true,
        name: true,
        slaWarningDays: true,
        slaExceededDays: true,
      },
    })

    return NextResponse.json({ data: entities })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: err.message } }, { status })
    }
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission('recruitment:admin')
    const body = await request.json()
    const { entityId, ...config } = body as { entityId: string } & Record<string, any>

    if (!entityId) {
      return NextResponse.json({ error: { message: 'entityId is required' } }, { status: 400 })
    }

    const entityIds = visibleEntityIds(user, 'recruitment:admin')
    if (entityIds !== 'ALL' && !entityIds.includes(entityId)) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
    }

    const parsed = slaSchema.safeParse(config)
    if (!parsed.success) {
      return NextResponse.json({ error: { message: 'Validation failed', details: parsed.error.flatten() } }, { status: 422 })
    }

    const updated = await prisma.entity.update({
      where: { id: entityId },
      data: parsed.data,
      select: { id: true, name: true, slaWarningDays: true, slaExceededDays: true },
    })

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: err.message } }, { status })
    }
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
