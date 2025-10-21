import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { canMutateStarter } from '@/lib/rbac'
import { calculateWeekNumber, getYearInTimezone } from '@/lib/week-utils'
import { createAuditLog } from '@/lib/audit'
import { normalizeString } from '@/lib/utils'

const UpdateStarterSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.enum(['NL', 'FR']).optional(),
  entityId: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  roleTitle: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  startDate: z.string().datetime().optional(),
  hasExperience: z.boolean().optional(),
  experienceSince: z.string().datetime().nullable().optional(),
  experienceRole: z.string().nullable().optional(),
  experienceEntity: z.string().nullable().optional(),
})

// GET - Get single starter
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id: params.id },
      include: {
        entity: true,
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canMutate = await canMutateStarter(user, params.id)
    if (!canMutate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateStarterSchema.parse(body)

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = normalizeString(data.name)
    if (data.language !== undefined) updateData.language = data.language
    if (data.entityId !== undefined) updateData.entityId = data.entityId
    if (data.region !== undefined) updateData.region = normalizeString(data.region)
    if (data.roleTitle !== undefined) updateData.roleTitle = normalizeString(data.roleTitle)
    if (data.via !== undefined) updateData.via = normalizeString(data.via)
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.hasExperience !== undefined) updateData.hasExperience = data.hasExperience
    if (data.experienceSince !== undefined) updateData.experienceSince = data.experienceSince ? new Date(data.experienceSince) : null
    if (data.experienceRole !== undefined) updateData.experienceRole = normalizeString(data.experienceRole)
    if (data.experienceEntity !== undefined) updateData.experienceEntity = normalizeString(data.experienceEntity)

    if (data.startDate) {
      const startDate = new Date(data.startDate)
      updateData.startDate = startDate
      updateData.weekNumber = calculateWeekNumber(startDate)
      updateData.year = getYearInTimezone(startDate)
    }

    const starter = await prisma.starter.update({
      where: { id: params.id },
      data: updateData,
      include: {
        entity: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Starter:${starter.id}`,
      meta: { name: starter.name, changes: Object.keys(updateData) },
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canMutate = await canMutateStarter(user, params.id)
    if (!canMutate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.starter.delete({
      where: { id: params.id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `Starter:${params.id}`,
      meta: { name: starter.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

