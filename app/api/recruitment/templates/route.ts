import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { vacancyTemplateCreateSchema } from '@/lib/recruitment/schemas'

export async function GET() {
  try {
    const user = await requirePermission('recruitment:read')

    const entityScope = visibleEntityIds(user, 'recruitment:read')
    const where = entityScope === 'ALL' ? {} : { entityId: { in: entityScope } }

    const templates = await prisma.vacancyTemplate.findMany({
      where,
      include: {
        entity: true,
        function: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: templates })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission('recruitment:admin')

    const body = await req.json()
    const parsed = vacancyTemplateCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    if (!can(user, 'recruitment:admin', { entityId: parsed.data.entityId })) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const template = await prisma.vacancyTemplate.create({
      data: {
        name: parsed.data.name,
        entityId: parsed.data.entityId,
        functionId: parsed.data.functionId ?? null,
        content: parsed.data.content ?? [],
        stages: parsed.data.stages ?? [],
        dealbreakers: parsed.data.dealbreakers ?? [],
        niceToHaves: parsed.data.niceToHaves ?? [],
        scorecardCriteria: parsed.data.scorecardCriteria ?? [],
        createdById: user.id,
      },
      include: {
        entity: true,
        function: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
