import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { calculateWeekNumber, getYearInTimezone } from '@/lib/week-utils'
import { createAuditLog } from '@/lib/audit'
import { normalizeString } from '@/lib/utils'
import { createAutomaticTasks } from '@/lib/task-automation'

const UpdateStarterSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.enum(['NL', 'FR']).optional(),
  entityId: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  roleTitle: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  contractSignedOn: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  hasExperience: z.boolean().optional(),
  experienceSince: z.string().datetime().nullable().optional(),
  experienceRole: z.string().nullable().optional(),
  experienceEntity: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  desiredEmail: z.string().email().nullable().optional(),
})

// GET - Get single starter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id: id },
      include: {
        entity: true,
        fromEntity: true,
      },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(starter)
  } catch (error) {
    console.error('Error fetching starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update starter
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canMutate = await canMutateStarter(user, id)
    if (!canMutate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateStarterSchema.parse(body)

    // Check if this is a pending boarding starter being activated
    const existingStarter = await prisma.starter.findUnique({
      where: { id },
      select: { isPendingBoarding: true, type: true },
    })

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = normalizeString(data.name)
    if (data.language !== undefined) updateData.language = data.language
    if (data.entityId !== undefined) updateData.entityId = data.entityId
    if (data.region !== undefined) updateData.region = normalizeString(data.region)
    if (data.roleTitle !== undefined) updateData.roleTitle = normalizeString(data.roleTitle)
    if (data.via !== undefined) updateData.via = normalizeString(data.via)
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.contractSignedOn !== undefined) updateData.contractSignedOn = data.contractSignedOn ? new Date(data.contractSignedOn) : null
    if (data.hasExperience !== undefined) updateData.hasExperience = data.hasExperience
    if (data.experienceSince !== undefined) updateData.experienceSince = data.experienceSince ? new Date(data.experienceSince) : null
    if (data.experienceRole !== undefined) updateData.experienceRole = normalizeString(data.experienceRole)
    if (data.experienceEntity !== undefined) updateData.experienceEntity = normalizeString(data.experienceEntity)
    if (data.phoneNumber !== undefined) updateData.phoneNumber = normalizeString(data.phoneNumber)
    if (data.desiredEmail !== undefined) updateData.desiredEmail = normalizeString(data.desiredEmail)

    const isActivatingPending = existingStarter?.isPendingBoarding && data.startDate

    if (data.startDate) {
      const startDate = new Date(data.startDate)
      updateData.startDate = startDate
      updateData.weekNumber = calculateWeekNumber(startDate)
      updateData.year = getYearInTimezone(startDate)
    }

    if (isActivatingPending) {
      updateData.isPendingBoarding = false
    }

    const starter = await prisma.starter.update({
      where: { id: id },
      data: updateData,
      include: {
        entity: true,
        fromEntity: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Starter:${starter.id}`,
      meta: {
        name: starter.name,
        changes: Object.keys(updateData),
        ...(isActivatingPending ? { activatedFromPending: true } : {}),
      },
    })

    // When activating a pending boarding starter, create automatic onboarding tasks + assign materials
    if (isActivatingPending) {
      try {
        // Complete/delete the "assign start date" task
        await prisma.task.updateMany({
          where: {
            starterId: id,
            title: { contains: 'Startdatum toewijzen' },
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            completedById: user.id,
          },
        })

        const starterType = existingStarter.type || 'ONBOARDING'
        console.log(`🚀 Activating pending starter "${starter.name}" - creating ${starterType} tasks`)
        const tasks = await createAutomaticTasks(starter, starterType)
        console.log(`✅ Created ${tasks.length} automatic tasks for activated starter ${starter.name}`)
      } catch (taskError) {
        console.error('Failed to create tasks for activated starter:', taskError)
      }

      // Auto-assign materials from job role
      if (starter.roleTitle && starter.entityId) {
        try {
          const jobRole = await prisma.jobRole.findUnique({
            where: {
              entityId_title: {
                entityId: starter.entityId,
                title: starter.roleTitle,
              },
            },
            include: {
              materials: {
                include: { material: true },
              },
            },
          })

          if (jobRole) {
            const activeMaterials = jobRole.materials.filter(jrm => jrm.material.isActive)
            let assigned = 0
            for (const jrm of activeMaterials) {
              const existing = await prisma.starterMaterial.findUnique({
                where: {
                  starterId_materialId: {
                    starterId: id,
                    materialId: jrm.materialId,
                  },
                },
              })
              if (!existing) {
                await prisma.starterMaterial.create({
                  data: {
                    starterId: id,
                    materialId: jrm.materialId,
                    notes: jrm.notes,
                  },
                })
                assigned++
              }
            }
            if (assigned > 0) {
              console.log(`📦 Assigned ${assigned} materials to activated starter ${starter.name}`)
            }
          }
        } catch (materialError) {
          console.error('Failed to assign materials for activated starter:', materialError)
        }
      }
    }

    return NextResponse.json(starter)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete starter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canMutate = await canMutateStarter(user, id)
    if (!canMutate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id: id },
      select: { id: true, name: true },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.starter.delete({
      where: { id: id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `Starter:${id}`,
      meta: { name: starter.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

