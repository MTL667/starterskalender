import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

// GET - Get materials for a starter
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const materials = await prisma.starterMaterial.findMany({
      where: { starterId: params.id },
      include: {
        material: true,
      },
      orderBy: {
        material: {
          order: 'asc',
        },
      },
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching starter materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Automatically assign materials from job role to starter
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get starter with role
    const starter = await prisma.starter.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        roleTitle: true,
        entityId: true,
      },
    })

    if (!starter || !starter.roleTitle || !starter.entityId) {
      return NextResponse.json(
        { error: 'Starter has no role or entity assigned' },
        { status: 400 }
      )
    }

    // Find the job role
    const jobRole = await prisma.jobRole.findUnique({
      where: {
        entityId_title: {
          entityId: starter.entityId,
          title: starter.roleTitle,
        },
      },
      include: {
        materials: {
          include: {
            material: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    if (!jobRole || jobRole.materials.length === 0) {
      return NextResponse.json(
        { message: 'No materials assigned to this role' },
        { status: 200 }
      )
    }

    // Create starter materials (skip if already exists)
    const createdMaterials = []
    for (const jrm of jobRole.materials) {
      const existing = await prisma.starterMaterial.findUnique({
        where: {
          starterId_materialId: {
            starterId: starter.id,
            materialId: jrm.materialId,
          },
        },
      })

      if (!existing) {
        const starterMaterial = await prisma.starterMaterial.create({
          data: {
            starterId: starter.id,
            materialId: jrm.materialId,
            notes: jrm.notes,
          },
          include: {
            material: true,
          },
        })
        createdMaterials.push(starterMaterial)
      }
    }

    if (createdMaterials.length > 0) {
      await createAuditLog({
        actorId: user.id,
        action: 'CREATE',
        target: `Starter:${starter.id}`,
        meta: {
          action: 'assigned_materials',
          count: createdMaterials.length,
        },
      })
    }

    return NextResponse.json({
      message: `${createdMaterials.length} materials assigned`,
      materials: createdMaterials,
    })
  } catch (error) {
    console.error('Error assigning materials to starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

