import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { vacancyPublishActionSchema } from '@/lib/recruitment/schemas'
import type { VacancyPublishValidationError } from '@/lib/recruitment/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requirePermission('vacancy:publish')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id, deletedAt: null },
      include: {
        stages: { select: { id: true } },
      },
    })

    if (!vacancy) {
      return NextResponse.json({ error: { message: 'Vacancy not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    if (!can(user, 'vacancy:publish', { entityId: vacancy.entityId })) {
      return NextResponse.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: { message: 'Invalid JSON body', code: 'INVALID_JSON' } }, { status: 400 })
    }
    const parsed = vacancyPublishActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, { status: 400 })
    }

    const { action } = parsed.data

    // State machine validation
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['publish'],
      PUBLISHED: ['unpublish', 'close'],
      CLOSED: ['unpublish'],
    }

    const allowed = validTransitions[vacancy.status] ?? []
    if (!allowed.includes(action)) {
      return NextResponse.json({
        error: { message: `Cannot ${action} a vacancy with status ${vacancy.status}`, code: 'INVALID_STATE' },
      }, { status: 400 })
    }

    // Publish validation
    if (action === 'publish') {
      const errors: VacancyPublishValidationError[] = []

      if (!vacancy.title || vacancy.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' })
      }

      const content = Array.isArray(vacancy.content) ? vacancy.content : []
      if (content.length === 0) {
        errors.push({ field: 'content', message: 'At least one content block is required' })
      }

      if (vacancy.stages.length === 0) {
        errors.push({ field: 'stages', message: 'At least one pipeline stage is required' })
      }

      if (errors.length > 0) {
        return NextResponse.json({
          error: { message: 'Publish validation failed', code: 'PUBLISH_VALIDATION', validationErrors: errors },
        }, { status: 422 })
      }
    }

    const statusMap: Record<string, 'DRAFT' | 'PUBLISHED' | 'CLOSED'> = {
      publish: 'PUBLISHED',
      unpublish: 'DRAFT',
      close: 'CLOSED',
    }

    const updated = await prisma.vacancy.update({
      where: { id, deletedAt: null },
      data: { status: statusMap[action] },
      select: { id: true, status: true, entity: { select: { siteGroupId: true, siteGroup: { select: { slug: true } } } } },
    })

    if (updated.entity?.siteGroup?.slug) {
      const slug = updated.entity.siteGroup.slug
      try {
        revalidatePath(`/jobs/${slug}`)
        revalidatePath(`/jobs/${slug}/${id}`)
      } catch (revalError) {
        console.error('[publish] revalidatePath failed:', revalError)
      }
    }

    return NextResponse.json({ data: { id: updated.id, status: updated.status } })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      const status = error.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: error.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } }, { status })
    }
    console.error('Error publishing vacancy:', error)
    return NextResponse.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
