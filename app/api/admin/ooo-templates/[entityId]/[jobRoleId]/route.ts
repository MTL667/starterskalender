import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const OooTemplateSchema = z.object({
  templateNl: z.string().min(1, 'Dutch template is required'),
  templateFr: z.string().min(1, 'French template is required'),
  templateEn: z.string().min(1, 'English template is required'),
  generalMailAddress: z.string().email('Must be a valid email address'),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string; jobRoleId: string }> }
) {
  try {
    const user = await requirePermission('mail:offboarding')
    const { entityId, jobRoleId } = await params

    if (!can(user, 'mail:offboarding', { entityId })) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'No access to this entity' },
        { status: 403 }
      )
    }

    const template = await prisma.oooTemplate.findUnique({
      where: {
        entityId_jobRoleId: { entityId, jobRoleId },
      },
      include: {
        jobRole: { select: { id: true, title: true } },
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'OOO template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: error.message },
        { status: 403 }
      )
    }
    console.error('[ooo-templates] GET single error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch OOO template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string; jobRoleId: string }> }
) {
  try {
    const user = await requirePermission('mail:offboarding')
    const { entityId, jobRoleId } = await params

    if (!can(user, 'mail:offboarding', { entityId })) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'No access to this entity' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = OooTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const template = await prisma.oooTemplate.upsert({
      where: {
        entityId_jobRoleId: { entityId, jobRoleId },
      },
      create: {
        entityId,
        jobRoleId,
        ...parsed.data,
      },
      update: parsed.data,
      include: {
        jobRole: { select: { id: true, title: true } },
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'entra.offboarding.ooo_template_updated',
      target: `ooo-template:${template.id}`,
      meta: { entityId, jobRoleId },
    })

    return NextResponse.json(template)
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: error.message },
        { status: 403 }
      )
    }
    console.error('[ooo-templates] PUT error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to save OOO template' },
      { status: 500 }
    )
  }
}
