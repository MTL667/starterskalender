import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { stageCreateSchema, stageUpdateSchema, stageReorderSchema } from '@/lib/recruitment/schemas'

async function getVacancyWithAuth(vacancyId: string) {
  const user = await requirePermission('vacancy:edit')
  const vacancy = await prisma.vacancy.findUnique({
    where: { id: vacancyId, deletedAt: null },
    select: { id: true, entityId: true },
  })
  if (!vacancy) return { error: 'NOT_FOUND' as const, user: null, vacancy: null }
  if (!can(user, 'vacancy:edit', { entityId: vacancy.entityId })) {
    return { error: 'FORBIDDEN' as const, user: null, vacancy: null }
  }
  return { error: null, user, vacancy }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('recruitment:read')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, entityId: true },
    })
    if (!vacancy) {
      return NextResponse.json({ error: { message: 'Vacancy not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const entityScope = visibleEntityIds(user, 'recruitment:read')
    if (entityScope !== 'ALL' && !entityScope.includes(vacancy.entityId)) {
      return NextResponse.json({ error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } }, { status: 403 })
    }

    const stages = await prisma.vacancyStage.findMany({
      where: { vacancyId: id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ data: stages })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error fetching stages:', error)
    return NextResponse.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error, vacancy } = await getVacancyWithAuth(id)
    if (error === 'NOT_FOUND') return NextResponse.json({ error: { message: 'Vacancy not found', code: 'NOT_FOUND' } }, { status: 404 })
    if (error === 'FORBIDDEN') return NextResponse.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 })

    const body = await request.json()
    const parsed = stageCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })
    }

    const { name, order, triggersEmail } = parsed.data

    const stage = await prisma.$transaction(async (tx) => {
      // Shift existing stages at or after the target order position
      await tx.vacancyStage.updateMany({
        where: { vacancyId: id, order: { gte: order } },
        data: { order: { increment: 1 } },
      })
      return tx.vacancyStage.create({
        data: { vacancyId: id, name, order, triggersEmail },
      })
    })

    return NextResponse.json({ data: stage }, { status: 201 })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error creating stage:', error)
    return NextResponse.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await getVacancyWithAuth(id)
    if (error === 'NOT_FOUND') return NextResponse.json({ error: { message: 'Vacancy not found', code: 'NOT_FOUND' } }, { status: 404 })
    if (error === 'FORBIDDEN') return NextResponse.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 })

    const body = await request.json()

    // Determine if this is a reorder (array) or single-stage update (object with stageId)
    if (Array.isArray(body)) {
      const parsed = stageReorderSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        // Verify all stage IDs belong to this vacancy
        const stageIds = parsed.data.map((item) => item.id)
        const validStages = await tx.vacancyStage.findMany({
          where: { id: { in: stageIds }, vacancyId: id },
          select: { id: true },
        })
        if (validStages.length !== stageIds.length) {
          throw new Error('VALIDATION: One or more stage IDs do not belong to this vacancy')
        }

        // Two-pass to avoid unique constraint: set negatives first
        for (const item of parsed.data) {
          await tx.vacancyStage.update({
            where: { id: item.id },
            data: { order: -(item.order + 1000) },
          })
        }
        // Then set the real orders
        for (const item of parsed.data) {
          await tx.vacancyStage.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        }
      })

      const stages = await prisma.vacancyStage.findMany({
        where: { vacancyId: id },
        orderBy: { order: 'asc' },
      })
      return NextResponse.json({ data: stages })
    }

    // Single stage update
    const { stageId, ...updateData } = body
    if (!stageId || typeof stageId !== 'string') {
      return NextResponse.json({ error: { message: 'stageId is required', code: 'VALIDATION_ERROR' } }, { status: 400 })
    }
    const parsed = stageUpdateSchema.safeParse(updateData)
    if (!parsed.success) {
      return NextResponse.json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })
    }

    const stage = await prisma.vacancyStage.findUnique({ where: { id: stageId }, select: { vacancyId: true } })
    if (!stage || stage.vacancyId !== id) {
      return NextResponse.json({ error: { message: 'Stage not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const updated = await prisma.vacancyStage.update({
      where: { id: stageId },
      data: parsed.data,
    })
    return NextResponse.json({ data: updated })
  } catch (error: any) {
    if (error?.message?.startsWith('VALIDATION:')) {
      return NextResponse.json({ error: { message: error.message.replace('VALIDATION: ', ''), code: 'VALIDATION_ERROR' } }, { status: 400 })
    }
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error updating stages:', error)
    return NextResponse.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await getVacancyWithAuth(id)
    if (error === 'NOT_FOUND') return NextResponse.json({ error: { message: 'Vacancy not found', code: 'NOT_FOUND' } }, { status: 404 })
    if (error === 'FORBIDDEN') return NextResponse.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const stageId = searchParams.get('stageId')
    if (!stageId) {
      return NextResponse.json({ error: { message: 'stageId query param required', code: 'VALIDATION_ERROR' } }, { status: 400 })
    }

    const stage = await prisma.vacancyStage.findUnique({ where: { id: stageId } })
    if (!stage || stage.vacancyId !== id) {
      return NextResponse.json({ error: { message: 'Stage not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    if (stage.isTerminal) {
      return NextResponse.json({ error: { message: 'Cannot delete terminal stages', code: 'INVALID_STATE' } }, { status: 400 })
    }

    // Check for candidates in this stage (future-proofing for Epic 2)
    // const candidateCount = await prisma.candidate.count({ where: { stageId } })
    const candidateCount = 0 // No Candidate model yet

    const confirm = searchParams.get('confirm')
    if (candidateCount > 0 && confirm !== 'true') {
      return NextResponse.json({ data: { requiresConfirmation: true, candidateCount } })
    }

    await prisma.$transaction(async (tx) => {
      await tx.vacancyStage.delete({ where: { id: stageId } })
      // Re-index remaining stages
      const remaining = await tx.vacancyStage.findMany({
        where: { vacancyId: id },
        orderBy: { order: 'asc' },
      })
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i) {
          await tx.vacancyStage.update({ where: { id: remaining[i].id }, data: { order: -(i + 1000) } })
        }
      }
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i) {
          await tx.vacancyStage.update({ where: { id: remaining[i].id }, data: { order: i } })
        }
      }
    })

    const stages = await prisma.vacancyStage.findMany({
      where: { vacancyId: id },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ data: stages })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error deleting stage:', error)
    return NextResponse.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
