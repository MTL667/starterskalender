import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

const UpdateBlockedPeriodSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  reason: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// PATCH - Update blocked period (alleen HR_ADMIN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || !isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateBlockedPeriodSchema.parse(body)

    const updateData: any = {}
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)
    if (data.reason !== undefined) updateData.reason = data.reason
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const blockedPeriod = await prisma.blockedPeriod.update({
      where: { id: id },
      data: updateData,
      include: {
        entity: true,
        jobRole: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `BlockedPeriod:${blockedPeriod.id}`,
      meta: { changes: Object.keys(data) },
    })

    return NextResponse.json(blockedPeriod)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating blocked period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete blocked period (alleen HR_ADMIN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || !isHRAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const blockedPeriod = await prisma.blockedPeriod.findUnique({
      where: { id: id },
    })

    if (!blockedPeriod) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.blockedPeriod.delete({
      where: { id: id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `BlockedPeriod:${id}`,
      meta: { entityId: blockedPeriod.entityId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blocked period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

