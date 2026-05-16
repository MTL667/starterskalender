import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { RECRUITMENT_EMAIL_VARIABLES } from '@/lib/recruitment/email-variables'
import { DEFAULT_RECRUITMENT_TEMPLATES } from '@/lib/recruitment/email-template-defaults'

export async function POST(request: Request) {
  try {
    const user = await requirePermission('recruitment:admin')
    const entityScope = visibleEntityIds(user, 'recruitment:admin')

    const { entityId } = await request.json()

    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json(
        { error: { message: 'entityId is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    if (entityScope !== 'ALL' && !entityScope.includes(entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const existing = await prisma.recruitmentEmailTemplate.count({
      where: { entityId },
    })

    if (existing > 0) {
      return NextResponse.json(
        { error: { message: 'Templates already exist for this entity', code: 'ALREADY_SEEDED' } },
        { status: 409 }
      )
    }

    await prisma.recruitmentEmailTemplate.createMany({
      data: DEFAULT_RECRUITMENT_TEMPLATES.map((tmpl) => ({
        entityId,
        type: tmpl.type,
        name: tmpl.name,
        subject: tmpl.subject,
        body: tmpl.body,
        variables: RECRUITMENT_EMAIL_VARIABLES.map((v) => v.key),
        isActive: false,
        createdById: user.id,
      })),
    })

    return NextResponse.json({ data: { seeded: true, count: DEFAULT_RECRUITMENT_TEMPLATES.length } }, { status: 201 })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Email template seed error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
