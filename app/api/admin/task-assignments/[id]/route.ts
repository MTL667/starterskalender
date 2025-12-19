import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

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

