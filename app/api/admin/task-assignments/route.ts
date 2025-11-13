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
        role: {
          not: 'NONE',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
            role: true,
          },
        })
        return {
          ...assignment,
          assignee,
        }
      })
    )

    return NextResponse.json({
      assignments: assignmentsWithAssignees,
      users,
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

    if (!taskType || !assignedToId) {
      return NextResponse.json(
        { error: 'taskType and assignedToId are required' },
        { status: 400 }
      )
    }

    // Upsert assignment (create or update)
    const assignment = await prisma.taskAssignment.upsert({
      where: {
        entityId_taskType: {
          entityId: (entityId || null) as any,
          taskType,
        },
      },
      update: {
        assignedToId,
        notifyChannel: notifyChannel || 'BOTH',
        updatedAt: new Date(),
      },
      create: {
        entityId: (entityId || null) as any,
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

    // Get assignee details
    const assignee = await prisma.user.findUnique({
      where: { id: assignment.assignedToId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
      assignee,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating task assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create/update task assignment', details: (error as Error).message },
      { status: 500 }
    )
  }
}

