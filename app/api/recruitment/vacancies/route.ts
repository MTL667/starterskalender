import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { vacancyCreateSchema } from '@/lib/recruitment/schemas'

export async function GET() {
  try {
    const user = await requirePermission('recruitment:read')

    const entityScope = visibleEntityIds(user, 'recruitment:read')
    const where = entityScope === 'ALL'
      ? { deletedAt: null }
      : { entityId: { in: entityScope }, deletedAt: null }

    const vacancies = await prisma.vacancy.findMany({
      where,
      include: {
        entity: { select: { id: true, name: true, colorHex: true, isActive: true, slaWarningDays: true, slaExceededDays: true } },
        stages: { orderBy: { order: 'asc' } },
        candidates: {
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { updatedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = Date.now()
    const data = vacancies.map(v => {
      const warningMs = v.entity.slaWarningDays * 86400000
      const exceededMs = v.entity.slaExceededDays * 86400000
      let slaWarning = 0
      let slaExceeded = 0

      for (const c of v.candidates) {
        const age = now - c.updatedAt.getTime()
        if (age >= exceededMs) slaExceeded++
        else if (age >= warningMs) slaWarning++
      }

      const { candidates: _, ...rest } = v
      return { ...rest, slaWarning, slaExceeded }
    })

    return NextResponse.json({ data })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error fetching vacancies:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await requirePermission('vacancy:create')

    const body = await req.json()
    const parsed = vacancyCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    if (!can(user, 'vacancy:create', { entityId: parsed.data.entityId })) {
      return NextResponse.json(
        { error: { message: 'Forbidden: no access to this entity', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const { templateId, content, ...vacancyFields } = parsed.data

    let templateScorecardCriteria: Prisma.InputJsonValue = []
    if (templateId) {
      const template = await prisma.vacancyTemplate.findUnique({
        where: { id: templateId },
        select: { entityId: true, scorecardCriteria: true },
      })
      if (!template || template.entityId !== vacancyFields.entityId) {
        return NextResponse.json(
          { error: { message: 'Template not found or does not belong to this entity', code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }
      templateScorecardCriteria = Array.isArray(template.scorecardCriteria)
        ? (template.scorecardCriteria as Prisma.InputJsonValue)
        : []
    }

    const vacancy = await prisma.vacancy.create({
      data: {
        ...vacancyFields,
        templateId: templateId ?? null,
        content: content ?? [],
        scorecardCriteria: templateScorecardCriteria,
        createdById: user.id,
        stages: {
          create: [
            { name: 'Applied', order: 0, isTerminal: false, triggersEmail: true },
            { name: 'Screening', order: 1, isTerminal: false, triggersEmail: false },
            { name: 'Interview', order: 2, isTerminal: false, triggersEmail: true },
            { name: 'Offer', order: 3, isTerminal: false, triggersEmail: true },
            { name: 'Hired', order: 4, isTerminal: true, triggersEmail: true },
            { name: 'Rejected', order: 5, isTerminal: true, triggersEmail: true },
          ],
        },
      },
      include: { entity: true, stages: { orderBy: { order: 'asc' } } },
    })

    if (templateId) {
      await prisma.vacancyTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      }).catch((err) => console.error('Failed to increment template usageCount:', err))
    }

    return NextResponse.json({ data: vacancy }, { status: 201 })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error creating vacancy:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
