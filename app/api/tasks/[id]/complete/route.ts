import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// POST /api/tasks/[id]/complete - Markeer taak als voltooid
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        starter: true,
        assignedTo: {
          select: {
            email: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Alleen toegewezen persoon of admin kan voltooien
    const isAdmin = user.role === 'HR_ADMIN'
    const isAssignedToMe = task.assignedToId === user.id

    if (!isAdmin && !isAssignedToMe) {
      return NextResponse.json(
        { error: 'Only assigned user or admin can complete this task' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { completionNotes } = body

    // Update task naar COMPLETED
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: user.id,
        completionNotes,
      },
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
        completedBy: {
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
        action: 'TASK_COMPLETED',
        target: `Task:${updatedTask.id}`,
        meta: {
          taskId: updatedTask.id,
          title: updatedTask.title,
          completionNotes,
        },
      },
    })

    // Maak notificatie aan voor de aanmaker (als verschillend van voltooier)
    if (task.createdById && task.createdById !== user.id) {
      await prisma.notification.create({
        data: {
          userId: task.createdById,
          type: 'TASK_COMPLETED',
          title: 'Taak voltooid',
          message: `"${task.title}" is voltooid door ${user.name || user.email}`,
          taskId: task.id,
          starterId: task.starterId,
          linkUrl: `/taken/${task.id}`,
        },
      })
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Failed to complete task', details: (error as Error).message },
      { status: 500 }
    )
  }
}

