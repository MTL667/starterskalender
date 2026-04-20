import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { sendTaskReassignmentEmail } from '@/lib/task-automation'
import { eventBus } from '@/lib/events'

// GET /api/tasks/[id] - Haal specifieke taak op
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const isAdmin = user.role === 'HR_ADMIN'

    const task = await prisma.task.findUnique({
      where: { id: id },
      include: {
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            startDate: true,
            phoneNumber: true,
            desiredEmail: true,
            notes: true,
            entity: {
              select: {
                id: true,
                name: true,
                colorHex: true,
              },
            },
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        uploads: {
          orderBy: { uploadedAt: 'desc' },
        },
        reassignHistory: {
          orderBy: { reassignedAt: 'desc' },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Haal template + dependencies (concrete taken) op voor visualisatie
    let template: any = null
    let dependencies: any[] = []
    if (task.templateId) {
      template = await prisma.taskTemplate.findUnique({
        where: { id: task.templateId },
        select: {
          id: true,
          dependsOnTemplateIds: true,
          scheduleType: true,
          addToCalendar: true,
          uploadFolder: true,
          expectedOutputs: true,
        },
      })
    }
    if (task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0) {
      dependencies = await prisma.task.findMany({
        where: { id: { in: task.dependsOnTaskIds } },
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          assignedTo: { select: { id: true, name: true, email: true } },
          completedAt: true,
        },
      })
    }

    const taskWithMeta = { ...task, template, dependencies }

    // Permissions check
    if (!isAdmin) {
      const isAssignedToMe = task.assignedToId === user.id
      const hasEntityAccess = user.memberships?.some(
        (m: any) => m.entityId === task.entityId
      )

      if (!isAssignedToMe && !hasEntityAccess) {
        return NextResponse.json({ error: 'No access to this task' }, { status: 403 })
      }
    }

    return NextResponse.json(taskWithMeta)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// PATCH /api/tasks/[id] - Update taak
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const isAdmin = user.role === 'HR_ADMIN'

    const task = await prisma.task.findUnique({
      where: { id: id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Permissions check
    if (!isAdmin) {
      const isAssignedToMe = task.assignedToId === user.id
      const hasEntityAccess = user.memberships?.some(
        (m: any) => m.entityId === task.entityId
      )

      if (!isAssignedToMe && !hasEntityAccess) {
        return NextResponse.json({ error: 'No access to this task' }, { status: 403 })
      }
    }

    const body = await req.json()
    const {
      title,
      description,
      status,
      priority,
      assignedToId,
      dueDate,
      blockedReason,
      reassignReason,
    } = body

    // Build update data
    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (blockedReason !== undefined) updateData.blockedReason = blockedReason

    // Als assignedToId verandert
    const assigneeChanged = assignedToId !== undefined && assignedToId !== task.assignedToId
    if (assigneeChanged) {
      updateData.assignedToId = assignedToId
      updateData.assignedAt = assignedToId ? new Date() : null
    }

    const updatedTask = await prisma.task.update({
      where: { id: id },
      data: updateData,
      include: {
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            startDate: true,
            notes: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TASK_UPDATED',
        target: `Task:${updatedTask.id}`,
        meta: {
          taskId: updatedTask.id,
          changes: updateData,
        },
      },
    })

    if (updatedTask.entityId) {
      eventBus.emit({ type: 'task:updated', entityId: updatedTask.entityId, payload: { taskId: updatedTask.id } })
    }

    // Log reassignment en stuur email
    if (assigneeChanged) {
      try {
        await prisma.taskReassignment.create({
          data: {
            taskId: updatedTask.id,
            fromUserId: task.assignedToId,
            toUserId: assignedToId,
            reassignedById: user.id,
            reason: reassignReason || null,
          },
        })
      } catch (logErr) {
        console.error('Failed to log task reassignment:', logErr)
      }

      if (updateData.assignedToId) {
        try {
          const reassignerName = user.name || user.email || 'Een beheerder'
          await sendTaskReassignmentEmail(updatedTask, reassignerName)
          console.log(`📧 Reassignment email sent for task ${updatedTask.id} to ${updatedTask.assignedTo?.email}`)
        } catch (emailError) {
          console.error('Failed to send reassignment email:', emailError)
        }
      }
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Verwijder taak
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const isAdmin = user.role === 'HR_ADMIN'

    const task = await prisma.task.findUnique({
      where: { id: id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Permissions check - alleen admins of de creator kunnen verwijderen
    if (!isAdmin && task.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only admins or task creator can delete tasks' },
        { status: 403 }
      )
    }

    await prisma.task.delete({
      where: { id: id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'TASK_DELETED',
        target: `Task:${id}`,
        meta: {
          taskId: id,
          title: task.title,
        },
      },
    })

    return NextResponse.json({ success: true, message: 'Task deleted' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task', details: (error as Error).message },
      { status: 500 }
    )
  }
}

