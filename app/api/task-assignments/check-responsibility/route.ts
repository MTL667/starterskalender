import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * Check if current user is IT_SETUP responsible for a given entity
 * Public endpoint (requires authentication only)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const entityId = searchParams.get('entityId')
    const taskType = searchParams.get('taskType') || 'IT_SETUP'

    if (!entityId) {
      return NextResponse.json({ error: 'entityId required' }, { status: 400 })
    }

    // Check if user is responsible for this task type for this entity or globally
    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        taskType: taskType as any,
        assignedToId: session.user.id,
        OR: [
          { entityId: entityId },
          { entityId: null }, // Global assignment
        ],
      },
    })

    return NextResponse.json({
      isResponsible: !!assignment,
      assignment: assignment ? {
        id: assignment.id,
        taskType: assignment.taskType,
        entityId: assignment.entityId,
        notifyChannel: assignment.notifyChannel,
      } : null,
    })
  } catch (error) {
    console.error('Error checking task responsibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

