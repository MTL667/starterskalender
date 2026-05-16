import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { eventBus } from '@/lib/events'
import { ALL_SHAREABLE_FIELD_KEYS } from '@/lib/recruitment/field-mask'
import crypto from 'crypto'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const user = await requirePermission('candidate:share')

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null },
      select: { id: true, vacancy: { select: { entityId: true } } },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'candidate:share')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const shares = await prisma.candidateShare.findMany({
      where: { candidateId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        sharedWith: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    const data = shares.map((s) => ({
      id: s.id,
      sharedWith: s.sharedWith,
      createdBy: s.createdBy,
      visibleFields: s.visibleFields,
      expiresAt: s.expiresAt,
      evaluationSubmittedAt: s.evaluationSubmittedAt,
      createdAt: s.createdAt,
      isExpired: s.expiresAt ? s.expiresAt < new Date() : false,
    }))

    return NextResponse.json({ data })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Share list error:', err)
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
    const user = await requirePermission('candidate:share')

    const body = await request.json()
    const { userId, visibleFields, expiresAt, templateId } = body as {
      userId?: string
      visibleFields?: string[]
      expiresAt?: string | null
      templateId?: string | null
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: { message: 'userId is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    if (!visibleFields || !Array.isArray(visibleFields) || visibleFields.length === 0) {
      return NextResponse.json(
        { error: { message: 'visibleFields must be a non-empty array', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const invalidFields = visibleFields.filter(
      (f) => !ALL_SHAREABLE_FIELD_KEYS.includes(f as any)
    )
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: { message: `Invalid fields: ${invalidFields.join(', ')}`, code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: { message: 'Cannot share with yourself', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, vacancy: { select: { id: true, entityId: true, title: true } } },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: { message: 'Candidate not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const entityIds = visibleEntityIds(user, 'candidate:share')
    if (entityIds !== 'ALL' && !entityIds.includes(candidate.vacancy.entityId)) {
      return NextResponse.json(
        { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: { message: 'Target user not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const token = crypto.randomUUID()
    let parsedExpiry: Date | null = null
    if (expiresAt) {
      parsedExpiry = new Date(expiresAt)
      const now = new Date()
      const maxExpiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      if (isNaN(parsedExpiry.getTime()) || parsedExpiry <= now) {
        return NextResponse.json(
          { error: { message: 'expiresAt must be a valid future date', code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }
      if (parsedExpiry > maxExpiry) {
        return NextResponse.json(
          { error: { message: 'expiresAt may not exceed 90 days from now', code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }
    }

    const share = await prisma.candidateShare.create({
      data: {
        candidateId,
        sharedWithUserId: userId,
        createdById: user.id,
        visibleFields,
        token,
        expiresAt: parsedExpiry,
      },
      include: {
        sharedWith: { select: { id: true, name: true, email: true } },
      },
    })

    if (templateId) {
      await prisma.shareTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {})
    }

    await createAuditLog({
      actorId: user.id,
      action: 'CANDIDATE_SHARED',
      target: candidateId,
      meta: {
        shareId: share.id,
        sharedWithId: userId,
        sharedWithName: targetUser.name,
        visibleFields,
        expiresAt: parsedExpiry?.toISOString() ?? null,
        vacancyId: candidate.vacancy.id,
      },
    })

    await prisma.notification.create({
      data: {
        userId,
        type: 'CANDIDATE_SHARED',
        title: `Kandidaat gedeeld voor review`,
        message: `${user.name ?? 'Een recruiter'} heeft ${candidate.firstName} ${candidate.lastName} met je gedeeld voor de vacature "${candidate.vacancy.title}".`,
        linkUrl: `/recruitment/shared/${token}`,
      },
    })

    eventBus.emit({
      type: 'recruitment:share:created',
      entityId: candidate.vacancy.entityId,
      payload: { shareId: share.id, candidateId, sharedWithUserId: userId },
    })

    eventBus.emit({
      type: 'notification:new',
      entityId: '*',
      payload: { userId },
    })

    return NextResponse.json(
      {
        data: {
          id: share.id,
          token: share.token,
          expiresAt: share.expiresAt,
          sharedWith: share.sharedWith,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Share creation error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
