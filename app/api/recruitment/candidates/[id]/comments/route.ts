import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events'

const commentSchema = z.object({
  text: z.string().min(1).max(2000),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('recruitment:read')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null },
      select: { vacancy: { select: { entityId: true } } },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'recruitment:read')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const comments = await prisma.candidateComment.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ data: comments })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Get comments error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('recruitment:write')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null },
      select: { vacancy: { select: { entityId: true } } },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'recruitment:write')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON body', code: 'INVALID_JSON' } },
        { status: 400 }
      )
    }

    const parsed = commentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 422 }
      )
    }

    const comment = await prisma.candidateComment.create({
      data: {
        candidateId,
        authorId: user.id,
        text: parsed.data.text,
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
      },
    })

    try {
      eventBus.emit({
        type: 'recruitment:candidate:comment-added',
        entityId: candidate.vacancy.entityId,
        payload: { candidateId, comment } as unknown as Record<string, unknown>,
      })
    } catch { /* SSE is non-critical */ }

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Create comment error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
