import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// GET /api/tasks - Haal taken op (met filters)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const assignedToMe = searchParams.get('assignedToMe') === 'true'
    const starterId = searchParams.get('starterId')
    const entityId = searchParams.get('entityId')
    const type = searchParams.get('type')

    const user = session.user as any
    const isAdmin = user.role === 'HR_ADMIN'

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

    // Als niet admin, alleen taken zien die:
    // 1. Aan jou toegewezen zijn
    // 2. Of van entiteiten waar je toegang tot hebt
    if (!isAdmin && !assignedToMe) {
      const membershipEntityIds = user.memberships?.map((m: any) => m.entityId) || []
      
      where.OR = [
        { assignedToId: user.id },
        { entityId: { in: membershipEntityIds } },
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        starter: {
          select: {
            id: true,
            name: true,
            startDate: true,
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
        { status: 'asc' }, // PENDING eerst
        { priority: 'desc' }, // URGENT eerst
        { dueDate: 'asc' }, // Vroegste deadline eerst
      ],
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const isAdmin = user.role === 'HR_ADMIN'

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
      // Als niet admin, check of user toegang heeft tot de entiteit
      if (entityId) {
        const hasAccess = user.memberships?.some((m: any) => m.entityId === entityId)
        if (!hasAccess) {
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

    // TODO: Create notification for assigned user (will be implemented in notification API)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task', details: (error as Error).message },
      { status: 500 }
    )
  }
}

