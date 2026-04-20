import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { createAutomaticTasks } from '@/lib/task-automation'
import { createAuditLog } from '@/lib/audit'

/**
 * POST /api/starters/[id]/regenerate-tasks
 *
 * Body: { mode?: 'append' | 'reset' }
 *  - 'append' (default): maak alleen ontbrekende template-taken aan voor deze
 *    starter. Bestaande taken (inclusief voltooide en lopende) blijven intact.
 *    Dependencies worden correct geresolved naar bestaande task-IDs.
 *  - 'reset': verwijder alle automatisch aangemaakte taken (met templateId) en
 *    maak ze opnieuw aan. Destructief — voltooide taken en notities gaan
 *    verloren.
 */
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

    const body = await request.json().catch(() => ({}))
    const mode: 'append' | 'reset' = body?.mode === 'reset' ? 'reset' : 'append'

    const starter = await prisma.starter.findUnique({
      where: { id },
      include: { entity: true, fromEntity: true },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let deletedCount = 0
    let newTasks: any[] = []

    if (mode === 'reset') {
      const deleted = await prisma.task.deleteMany({
        where: {
          starterId: id,
          templateId: { not: null },
        },
      })
      deletedCount = deleted.count
      console.log(`🗑️ Deleted ${deletedCount} old auto-generated tasks for starter "${starter.firstName} ${starter.lastName}" (${starter.type})`)
      newTasks = await createAutomaticTasks(starter, starter.type)
    } else {
      // append mode: sla bestaande templates over
      newTasks = await createAutomaticTasks(starter, starter.type, { skipExisting: true })
    }

    console.log(`✅ Regenerated ${newTasks.length} tasks for starter "${starter.firstName} ${starter.lastName}" (${starter.type}) in mode=${mode}`)

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Starter:${id}`,
      meta: { action: 'regenerate-tasks', mode, deleted: deletedCount, created: newTasks.length },
    })

    return NextResponse.json({
      mode,
      deleted: deletedCount,
      created: newTasks.length,
      tasks: newTasks.map(t => ({ id: t.id, title: t.title, type: t.type })),
    })
  } catch (error) {
    console.error('Error regenerating tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
