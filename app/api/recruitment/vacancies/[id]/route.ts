import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { vacancyUpdateSchema } from '@/lib/recruitment/schemas'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:read')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id, deletedAt: null },
      include: {
        entity: true,
        function: true,
        createdBy: { select: { id: true, name: true, email: true } },
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { evaluations: true } },
      },
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityScope = visibleEntityIds(user, 'recruitment:read')
    if (entityScope !== 'ALL' && !entityScope.includes(vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    return NextResponse.json({ data: vacancy })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error fetching vacancy:', error)
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
    const user = await requirePermission('vacancy:edit')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id, deletedAt: null },
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (!can(user, 'vacancy:edit', { entityId: vacancy.entityId })) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = vacancyUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    const updated = await prisma.vacancy.update({
      where: { id, deletedAt: null },
      data: parsed.data,
      include: {
        entity: true,
        function: true,
        createdBy: { select: { id: true, name: true, email: true } },
        stages: { orderBy: { order: 'asc' } },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error updating vacancy:', error)
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
    const user = await requirePermission('vacancy:delete')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id, deletedAt: null },
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (!can(user, 'vacancy:delete', { entityId: vacancy.entityId })) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    if (vacancy.status !== 'DRAFT') {
      return NextResponse.json(
        { error: { message: 'Only draft vacancies can be deleted', code: 'INVALID_STATE' } },
        { status: 400 }
      )
    }

    await prisma.vacancy.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error deleting vacancy:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
