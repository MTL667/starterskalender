import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

const UpdateStarterMaterialSchema = z.object({
  isProvided: z.boolean(),
  notes: z.string().optional().nullable(),
})

// PATCH - Update material status (mark as provided)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = UpdateStarterMaterialSchema.parse(body)

    const starterMaterial = await prisma.starterMaterial.update({
      where: {
        starterId_materialId: {
          starterId: params.id,
          materialId: params.materialId,
        },
      },
      data: {
        isProvided: data.isProvided,
        providedAt: data.isProvided ? new Date() : null,
        providedBy: data.isProvided ? user.id : null,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      include: {
        material: true,
        starter: {
          select: {
            name: true,
          },
        },
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `StarterMaterial:${starterMaterial.id}`,
      meta: {
        starter: starterMaterial.starter.name,
        material: starterMaterial.material.name,
        isProvided: starterMaterial.isProvided,
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

