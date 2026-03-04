import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { createAutomaticTasks } from '@/lib/task-automation'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isHRAdmin(user)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const starter = await prisma.starter.findUnique({
      where: { id },
      include: { entity: true, fromEntity: true },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Delete all existing auto-generated tasks (those with a templateId)
    const deleted = await prisma.task.deleteMany({
      where: {
        starterId: id,
        templateId: { not: null },
      },
    })

    console.log(`🗑️ Deleted ${deleted.count} old auto-generated tasks for starter "${starter.name}" (${starter.type})`)

    // Recreate tasks with the correct type
    const newTasks = await createAutomaticTasks(starter, starter.type)

    console.log(`✅ Regenerated ${newTasks.length} tasks for starter "${starter.name}" (${starter.type})`)

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Starter:${id}`,
      meta: { action: 'regenerate-tasks', deleted: deleted.count, created: newTasks.length },
    })

    return NextResponse.json({
      deleted: deleted.count,
      created: newTasks.length,
      tasks: newTasks.map(t => ({ id: t.id, title: t.title, type: t.type })),
    })
  } catch (error) {
    console.error('Error regenerating tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
