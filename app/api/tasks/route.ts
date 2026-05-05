import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { toAuthorizedUser, visibleEntityIds, can } from '@/lib/authz'
import { isHRAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { eventBus } from '@/lib/events'

// GET /api/tasks - Haal taken op (met filters)
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const assignedToMe = searchParams.get('assignedToMe') === 'true'
    const starterId = searchParams.get('starterId')
    const entityId = searchParams.get('entityId')
    const type = searchParams.get('type')
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '1000')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    const authUser = toAuthorizedUser(user)
    const isAdmin = isHRAdmin(user)

    // Build where clause
    const where: any = {}

    // Filter op status
    if (status) {
      where.status = status
    }

    // Filter op toegewezen aan mij
    if (assignedToMe) {
      where.assignedToId = user.id
    }

    // Filter op starter
    if (starterId) {
      where.starterId = starterId
    }

    // Filter op entiteit
    if (entityId) {
      where.entityId = entityId
    }

    // Filter op type
    if (type) {
      where.type = type
    }

    if (!isAdmin && !assignedToMe) {
      const scope = visibleEntityIds(authUser, 'starters:read')
      if (scope === 'ALL') {
        where.OR = [{ assignedToId: user.id }, { entityId: { not: null } }]
      } else {
        where.OR = [{ assignedToId: user.id }, { entityId: { in: scope } }]
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            startDate: true,
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
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: limit,
      skip: offset,
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Maak nieuwe taak aan
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authUser = toAuthorizedUser(user)
    const isAdmin = isHRAdmin(user)

    const body = await req.json()
    const {
      type,
      title,
      description,
      priority,
      starterId,
      entityId,
      assignedToId,
      dueDate,
    } = body

    // Validatie
    if (!type || !title) {
      return NextResponse.json(
        { error: 'Type and title are required' },
        { status: 400 }
      )
    }

    // Permissions check
    if (!isAdmin) {
      if (entityId) {
        if (!can(authUser, 'starters:read', { entityId })) {
          return NextResponse.json({ error: 'No access to this entity' }, { status: 403 })
        }
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        type,
        title,
        description,
        priority: priority || 'MEDIUM',
        starterId,
        entityId,
        assignedToId,
        assignedAt: assignedToId ? new Date() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: user.id,
      },
      include: {
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
        action: 'TASK_CREATED',
        target: `Task:${task.id}`,
        meta: {
          taskId: task.id,
          type: task.type,
          title: task.title,
          assignedToId: task.assignedToId,
        },
      },
    })

    if (task.entityId) {
      eventBus.emit({ type: 'task:created', entityId: task.entityId, payload: { taskId: task.id } })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task', details: (error as Error).message },
      { status: 500 }
    )
  }
}

