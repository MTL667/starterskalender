import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// GET /api/admin/task-assignments - Haal alle task assignments op
export async function GET(req: Request) {
  try {
    await requireAdmin()

    const assignments = await prisma.taskAssignment.findMany({
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
      orderBy: [
        { entityId: 'asc' },
        { taskType: 'asc' },
      ],
    })

    // Get all users for assignee dropdown
    const users = await prisma.user.findMany({
      where: {
        legacyRole: {
          not: 'NONE',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        legacyRole: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get assignee details for each assignment
    const assignmentsWithAssignees = await Promise.all(
      assignments.map(async (assignment) => {
        const assignee = await prisma.user.findUnique({
          where: { id: assignment.assignedToId },
          select: {
            id: true,
            name: true,
            email: true,
            legacyRole: true,
          },
        })
        return {
          ...assignment,
          assignee: assignee ? { ...assignee, role: assignee.legacyRole } : null,
        }
      })
    )

    return NextResponse.json({
      assignments: assignmentsWithAssignees,
      users: users.map((u) => ({ ...u, role: u.legacyRole })),
    })
  } catch (error) {
    console.error('Error fetching task assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task assignments', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/admin/task-assignments - Maak of update assignment
export async function POST(req: Request) {
  try {
    const user = await requireAdmin()

    const body = await req.json()
    const { entityId, taskType, assignedToId, notifyChannel } = body

    console.log('📝 Task assignment request:', { entityId, taskType, assignedToId, notifyChannel })

    if (!taskType || !assignedToId) {
      return NextResponse.json(
        { error: 'taskType and assignedToId are required' },
        { status: 400 }
      )
    }

    // Normalize entityId: "global" string should become null
    const normalizedEntityId = (!entityId || entityId === 'global') ? null : entityId

    console.log('🔧 Normalized entityId:', normalizedEntityId)

    // Check if assignment already exists
    // Note: Can't use upsert with null in unique constraint, so we use findFirst + create/update
    const existingAssignment = await prisma.taskAssignment.findFirst({
      where: {
        entityId: normalizedEntityId,
        taskType,
      },
    })

    let assignment

    if (existingAssignment) {
      // Update existing
      console.log('📝 Updating existing assignment:', existingAssignment.id)
      assignment = await prisma.taskAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          assignedToId,
          notifyChannel: notifyChannel || 'BOTH',
          updatedAt: new Date(),
        },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              colorHex: true,
            },
          },
        },
      })
    } else {
      // Create new
      console.log('✨ Creating new assignment')
      assignment = await prisma.taskAssignment.create({
        data: {
          entityId: normalizedEntityId,
          taskType,
          assignedToId,
          notifyChannel: notifyChannel || 'BOTH',
          createdBy: user.id,
        },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              colorHex: true,
            },
          },
        },
      })
    }

    // Get assignee details
    const assignee = await prisma.user.findUnique({
      where: { id: assignment.assignedToId },
      select: {
        id: true,
        name: true,
        email: true,
        legacyRole: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TASK_ASSIGNMENT_UPDATED',
        target: `TaskAssignment:${assignment.id}`,
        meta: {
          assignmentId: assignment.id,
          entityId: assignment.entityId,
          taskType: assignment.taskType,
          assignedToId: assignment.assignedToId,
        },
      },
    })

    return NextResponse.json({
      ...assignment,
      assignee: assignee ? { ...assignee, role: assignee.legacyRole } : null,
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating/updating task assignment:', error)
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack,
    })
    return NextResponse.json(
      { 
        error: 'Failed to create/update task assignment', 
        details: (error as Error).message,
        name: (error as Error).name,
      },
      { status: 500 }
    )
  }
}

