import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { isMaterialManager } from '@/lib/rbac'

const UpdateMaterialStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_STOCK', 'ORDERED', 'RECEIVED', 'RESERVED']),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { id, materialId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMaterialManager(user)) {
      return NextResponse.json({ error: 'Forbidden: Material manager permission required' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateMaterialStatusSchema.parse(body)

    const now = new Date()
    const statusData: any = {
      status: data.status,
      isProvided: data.status === 'RESERVED',
      notes: data.notes !== undefined ? data.notes : undefined,
    }

    switch (data.status) {
      case 'PENDING':
        statusData.orderedAt = null
        statusData.expectedDeliveryDate = null
        statusData.receivedAt = null
        statusData.reservedAt = null
        statusData.reservedBy = null
        statusData.providedAt = null
        statusData.providedBy = null
        break
      case 'IN_STOCK':
        statusData.orderedAt = null
        statusData.expectedDeliveryDate = null
        statusData.receivedAt = null
        break
      case 'ORDERED':
        statusData.orderedAt = now
        statusData.expectedDeliveryDate = data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null
        statusData.receivedAt = null
        statusData.reservedAt = null
        statusData.reservedBy = null
        break
      case 'RECEIVED':
        statusData.receivedAt = now
        statusData.reservedAt = null
        statusData.reservedBy = null
        break
      case 'RESERVED':
        statusData.reservedAt = now
        statusData.reservedBy = user.id
        statusData.providedAt = now
        statusData.providedBy = user.id
        break
    }

    const starterMaterial = await prisma.starterMaterial.update({
      where: {
        starterId_materialId: {
          starterId: id,
          materialId,
        },
      },
      data: statusData,
      include: {
        material: true,
        starter: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `StarterMaterial:${starterMaterial.id}`,
      meta: {
        starter: `${starterMaterial.starter.firstName} ${starterMaterial.starter.lastName}`,
        material: starterMaterial.material.name,
        status: data.status,
      },
    })

    return NextResponse.json(starterMaterial)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating starter material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
