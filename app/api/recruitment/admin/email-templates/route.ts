import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { recruitmentEmailTemplateCreateSchema } from '@/lib/recruitment/schemas'
import { RECRUITMENT_EMAIL_VARIABLES } from '@/lib/recruitment/email-variables'

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('recruitment:admin')
    const entityScope = visibleEntityIds(user, 'recruitment:admin')

    const templates = await prisma.recruitmentEmailTemplate.findMany({
      where: entityScope === 'ALL' ? {} : { entityId: { in: entityScope } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { createdBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ data: templates })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Email templates list error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('recruitment:admin')
    const entityScope = visibleEntityIds(user, 'recruitment:admin')

    const body = await request.json()
    const parsed = recruitmentEmailTemplateCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    if (entityScope !== 'ALL' && !entityScope.includes(parsed.data.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const template = await prisma.recruitmentEmailTemplate.create({
      data: {
        ...parsed.data,
        variables: RECRUITMENT_EMAIL_VARIABLES.map((v) => v.key),
        createdById: user.id,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: { message: 'A template with this name and type already exists for this entity', code: 'DUPLICATE' } },
        { status: 409 }
      )
    }
    console.error('Email template creation error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
