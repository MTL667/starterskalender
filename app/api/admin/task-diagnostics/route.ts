import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

export async function GET(req: Request) {
  try {
    // Require admin access
    await requireAdmin()

    // Fetch task templates
    const taskTemplates = await prisma.taskTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fetch task assignments
    const taskAssignments = await prisma.taskAssignment.findMany({
      include: {
        entity: {
          select: {
            id: true,
            name: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fetch recent tasks
    const tasks = await prisma.task.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        starter: {
          select: {
            id: true,
            name: true,
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

    const totalTasks = await prisma.task.count()

    // Fetch user count (for stats)
    const userCount = await prisma.user.count({
      where: {
        role: {
          not: 'NONE',
        },
      },
    })

    // Analyze issues
    const issues: string[] = []
    const recommendations: string[] = []

    if (taskTemplates.length === 0) {
      issues.push('❌ Geen task templates gevonden in de database')
      recommendations.push(
        'Run het seed script: npm run db:seed-tasks (in Easypanel terminal)'
      )
    }

    if (taskAssignments.length === 0) {
      issues.push('❌ Geen task assignments geconfigureerd')
      recommendations.push(
        'Ga naar /admin/task-assignments en wijs verantwoordelijken toe aan taak types'
      )
    }

    // Check if templates have matching assignments
    const templateTypes = new Set(taskTemplates.map(t => t.type))
    const assignmentTypes = new Set(taskAssignments.map(a => a.taskType))
    
    const unmatchedTypes = Array.from(templateTypes).filter(
      type => !assignmentTypes.has(type)
    )

    if (unmatchedTypes.length > 0) {
      issues.push(
        `⚠️ Templates zonder assignment: ${unmatchedTypes.join(', ')}`
      )
      recommendations.push(
        `Wijs verantwoordelijken toe voor: ${unmatchedTypes.join(', ')} via /admin/task-assignments`
      )
    }

    // Check if any assignments point to non-existent users
    const invalidAssignments = taskAssignments.filter(a => !a.assignedTo)
    if (invalidAssignments.length > 0) {
      issues.push(
        `⚠️ ${invalidAssignments.length} assignment(s) verwijzen naar verwijderde gebruikers`
      )
      recommendations.push(
        'Update deze assignments via /admin/task-assignments'
      )
    }

    if (issues.length === 0) {
      recommendations.push('✅ Alles ziet er goed uit! Het systeem is klaar voor gebruik.')
      recommendations.push('Test door een nieuwe starter toe te voegen en check of de taken verschijnen.')
    }

    return NextResponse.json({
      taskTemplates: {
        count: taskTemplates.length,
        templates: taskTemplates,
      },
      taskAssignments: {
        count: taskAssignments.length,
        assignments: taskAssignments,
      },
      tasks: {
        count: totalTasks,
        recentTasks: tasks,
      },
      users: {
        count: userCount,
      },
      issues,
      recommendations,
    })
  } catch (error) {
    console.error('Error fetching task diagnostics:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch diagnostics',
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

