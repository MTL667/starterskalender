import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

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
            name: true,
            startDate: true,
            phoneNumber: true,
            desiredEmail: true,
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
      },
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

    return NextResponse.json(task)
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
    if (assignedToId !== undefined && assignedToId !== task.assignedToId) {
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
            name: true,
            startDate: true,
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

