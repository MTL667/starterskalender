import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/task-assignments/[id] - Update assignment
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

    return NextResponse.json({ ...updated, assignee })
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

