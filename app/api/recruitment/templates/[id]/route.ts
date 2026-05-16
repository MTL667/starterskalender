import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { vacancyTemplateUpdateSchema } from '@/lib/recruitment/schemas'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:read')

    const template = await prisma.vacancyTemplate.findUnique({
      where: { id },
      include: {
        entity: true,
        function: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityScope = visibleEntityIds(user, 'recruitment:read')
    if (entityScope !== 'ALL' && !entityScope.includes(template.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    return NextResponse.json({ data: template })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:admin')

    const template = await prisma.vacancyTemplate.findUnique({ where: { id } })

    if (!template) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (!can(user, 'recruitment:admin', { entityId: template.entityId })) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = vacancyTemplateUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    if (parsed.data.entityId && parsed.data.entityId !== template.entityId) {
      if (!can(user, 'recruitment:admin', { entityId: parsed.data.entityId })) {
        return NextResponse.json(
          { error: { message: 'Forbidden: no access to target entity', code: 'FORBIDDEN' } },
          { status: 403 }
        )
      }
    }

    const updated = await prisma.vacancyTemplate.update({
      where: { id },
      data: parsed.data,
      include: {
        entity: true,
        function: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:admin')

    const template = await prisma.vacancyTemplate.findUnique({ where: { id } })

    if (!template) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (!can(user, 'recruitment:admin', { entityId: template.entityId })) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    await prisma.vacancyTemplate.delete({ where: { id } })

    return NextResponse.json({ data: { success: true } })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
