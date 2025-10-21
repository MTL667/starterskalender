import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/audit'

const AddMaterialSchema = z.object({
  materialId: z.string(),
  isRequired: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

// GET - Get materials for a job role
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const materials = await prisma.jobRoleMaterial.findMany({
      where: { jobRoleId: params.id },
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
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching job role materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add material to job role
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const data = AddMaterialSchema.parse(body)

    // Check if already exists
    const existing = await prisma.jobRoleMaterial.findUnique({
      where: {
        jobRoleId_materialId: {
          jobRoleId: params.id,
          materialId: data.materialId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Dit materiaal is al toegevoegd aan deze functie' },
        { status: 400 }
      )
    }

    const jobRoleMaterial = await prisma.jobRoleMaterial.create({
      data: {
        jobRoleId: params.id,
        materialId: data.materialId,
        isRequired: data.isRequired,
        notes: data.notes,
      },
      include: {
        material: true,
        jobRole: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `JobRoleMaterial:${jobRoleMaterial.id}`,
      meta: {
        jobRole: jobRoleMaterial.jobRole.title,
        material: jobRoleMaterial.material.name,
      },
    })

    return NextResponse.json(jobRoleMaterial, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error adding material to job role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

