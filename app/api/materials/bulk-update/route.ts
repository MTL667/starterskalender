import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { isMaterialManager } from '@/lib/rbac'

const BulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: z.enum(['PENDING', 'IN_STOCK', 'ORDERED', 'RECEIVED', 'RESERVED', 'COLLECTED']),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMaterialManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { ids, status, expectedDeliveryDate } = BulkUpdateSchema.parse(body)

    if (status === 'COLLECTED' || status === 'RESERVED') {
      const materials = await prisma.starterMaterial.findMany({
        where: { id: { in: ids } },
        select: { starter: { select: { type: true } } },
      })
      const hasOffboarding = materials.some(m => m.starter.type === 'OFFBOARDING')
      const hasOnboarding = materials.some(m => m.starter.type !== 'OFFBOARDING')
      if (status === 'COLLECTED' && hasOnboarding) {
        return NextResponse.json({ error: 'COLLECTED status is only valid for offboarding materials' }, { status: 400 })
      }
      if (status === 'RESERVED' && hasOffboarding) {
        return NextResponse.json({ error: 'RESERVED status is not valid for offboarding materials. Use COLLECTED instead.' }, { status: 400 })
      }
    }

    const now = new Date()
    const updateData: any = { status, isProvided: status === 'RESERVED' || status === 'COLLECTED' }

    switch (status) {
      case 'PENDING':
        updateData.orderedAt = null
        updateData.expectedDeliveryDate = null
        updateData.receivedAt = null
        updateData.reservedAt = null
        updateData.reservedBy = null
        updateData.providedAt = null
        updateData.providedBy = null
        break
      case 'IN_STOCK':
        updateData.orderedAt = null
        updateData.expectedDeliveryDate = null
        updateData.receivedAt = null
        break
      case 'ORDERED':
        updateData.orderedAt = now
        updateData.expectedDeliveryDate = expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null
        updateData.receivedAt = null
        updateData.reservedAt = null
        updateData.reservedBy = null
        break
      case 'RECEIVED':
        updateData.receivedAt = now
        updateData.reservedAt = null
        updateData.reservedBy = null
        break
      case 'RESERVED':
        updateData.reservedAt = now
        updateData.reservedBy = user.id
        updateData.providedAt = now
        updateData.providedBy = user.id
        break
      case 'COLLECTED':
        updateData.reservedAt = null
        updateData.reservedBy = null
        updateData.providedAt = now
        updateData.providedBy = user.id
        break
    }

    const result = await prisma.starterMaterial.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `StarterMaterial:bulk`,
      meta: {
        action: 'bulk_status_update',
        count: result.count,
        status,
        ids,
      },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error bulk updating materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
