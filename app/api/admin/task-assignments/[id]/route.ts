import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { sendBulkRerouteEmail } from '@/lib/task-automation'

// PATCH /api/admin/task-assignments/[id] - Update assignment + optional task reroute
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAdmin()
    const body = await req.json()

    const assignment = await prisma.taskAssignment.findUnique({
      where: { id },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const assigneeChanged = body.assignedToId && body.assignedToId !== assignment.assignedToId

    const updated = await prisma.taskAssignment.update({
      where: { id },
      data: {
        ...(body.assignedToId && { assignedToId: body.assignedToId }),
        ...(body.notifyChannel && { notifyChannel: body.notifyChannel }),
        updatedAt: new Date(),
      },
    })

    const assignee = await prisma.user.findUnique({
      where: { id: updated.assignedToId },
      select: { id: true, name: true, email: true },
    })

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TASK_ASSIGNMENT_UPDATED',
        target: `TaskAssignment:${id}`,
        meta: {
          assignmentId: id,
          assignedToId: updated.assignedToId,
          notifyChannel: updated.notifyChannel,
        },
      },
    })

    // Build entity filter for open task query
    const buildTaskFilter = async () => {
      const filter: any = {
        type: updated.taskType,
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
      }

      if (updated.entityId) {
        filter.entityId = updated.entityId
      } else {
        // Global assignment: only tasks for entities without a specific override
        const entityOverrides = await prisma.taskAssignment.findMany({
          where: { taskType: updated.taskType, entityId: { not: null } },
          select: { entityId: true },
        })
        const overriddenEntityIds = entityOverrides
          .map((o) => o.entityId)
          .filter(Boolean) as string[]
        if (overriddenEntityIds.length > 0) {
          filter.entityId = { notIn: overriddenEntityIds }
        }
      }
      return filter
    }

    let openTaskCount = 0
    let reroutedCount = 0

    // Count open tasks when assignee changed (for the confirmation dialog)
    if (assigneeChanged) {
      const taskFilter = await buildTaskFilter()
      openTaskCount = await prisma.task.count({ where: taskFilter })
    }

    // Reroute tasks (separate call after user confirms)
    if (body.rerouteTasks) {
      const taskFilter = await buildTaskFilter()
      const tasksToReroute = await prisma.task.findMany({
        where: taskFilter,
        include: {
          starter: { select: { firstName: true, lastName: true } },
          entity: { select: { name: true } },
        },
      })

      if (tasksToReroute.length > 0) {
        const now = new Date()
        for (const task of tasksToReroute) {
          if (task.assignedToId === updated.assignedToId) continue
          const fromUserId = task.assignedToId
          await prisma.task.update({
            where: { id: task.id },
            data: { assignedToId: updated.assignedToId, assignedAt: now },
          })
          await prisma.taskReassignment.create({
            data: {
              taskId: task.id,
              fromUserId,
              toUserId: updated.assignedToId,
              reassignedById: user.id,
              reason: 'Standaard verantwoordelijke gewijzigd',
            },
          })
          reroutedCount++
        }

        if (reroutedCount > 0 && assignee) {
          await sendBulkRerouteEmail(
            tasksToReroute.filter((t) => t.assignedToId !== updated.assignedToId),
            assignee,
            user.name || user.email || 'Admin',
            updated.notifyChannel
          )
        }

        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'TASKS_BULK_REROUTED',
            target: `TaskAssignment:${id}`,
            meta: {
              assignmentId: id,
              taskType: updated.taskType,
              newAssignedToId: updated.assignedToId,
              reroutedCount,
            },
          },
        })
      }
    }

    return NextResponse.json({
      ...updated,
      assignee,
      openTaskCount: assigneeChanged ? openTaskCount : 0,
      reroutedCount,
    })
  } catch (error) {
    console.error('Error updating task assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update task assignment', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/task-assignments/[id] - Verwijder assignment
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAdmin()

    const assignment = await prisma.taskAssignment.findUnique({
      where: { id },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    await prisma.taskAssignment.delete({
      where: { id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TASK_ASSIGNMENT_DELETED',
        target: `TaskAssignment:${id}`,
        meta: {
          assignmentId: id,
          entityId: assignment.entityId,
          taskType: assignment.taskType,
        },
      },
    })

    return NextResponse.json({ success: true, message: 'Assignment deleted' })
  } catch (error) {
    console.error('Error deleting task assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete task assignment', details: (error as Error).message },
      { status: 500 }
    )
  }
}

