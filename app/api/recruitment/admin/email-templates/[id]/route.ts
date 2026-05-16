import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { recruitmentEmailTemplateUpdateSchema } from '@/lib/recruitment/schemas'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:admin')
    const entityScope = visibleEntityIds(user, 'recruitment:admin')

    const template = await prisma.recruitmentEmailTemplate.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    if (!template) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (entityScope !== 'ALL' && !entityScope.includes(template.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    return NextResponse.json({ data: template })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Email template fetch error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:admin')
    const entityScope = visibleEntityIds(user, 'recruitment:admin')

    const existing = await prisma.recruitmentEmailTemplate.findUnique({
      where: { id },
      select: { entityId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (entityScope !== 'ALL' && !entityScope.includes(existing.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = recruitmentEmailTemplateUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    const template = await prisma.recruitmentEmailTemplate.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ data: template })
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
    console.error('Email template update error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:admin')
    const entityScope = visibleEntityIds(user, 'recruitment:admin')

    const existing = await prisma.recruitmentEmailTemplate.findUnique({
      where: { id },
      select: { entityId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (entityScope !== 'ALL' && !entityScope.includes(existing.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    await prisma.recruitmentEmailTemplate.delete({ where: { id } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Email template delete error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
