import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getVisibleEntities } from '@/lib/rbac'

export interface StarterHealthScore {
  starterId: string
  overall: number
  taskScore: number
  materialScore: number
  documentScore: number
  timelineScore: number
  level: 'green' | 'orange' | 'red'
  tasks: { completed: number; total: number; overdue: number }
  materials: { provided: number; total: number }
  documents: { signed: number; total: number }
  daysUntilStart: number | null
}

function calcLevel(score: number): 'green' | 'orange' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'orange'
  return 'red'
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const starterIds = searchParams.get('starterIds')?.split(',').filter(Boolean)
    const entityId = searchParams.get('entityId')

    const visibleEntities = await getVisibleEntities(user)
    const visibleEntityIds = visibleEntities.map(e => e.id)

    const where: any = {
      isCancelled: false,
      entityId: { in: visibleEntityIds },
    }

    if (starterIds?.length) {
      where.id = { in: starterIds }
    }

    if (entityId && visibleEntityIds.includes(entityId)) {
      where.entityId = entityId
    }

    const starters = await prisma.starter.findMany({
      where,
      select: {
        id: true,
        startDate: true,
        isPendingBoarding: true,
        tasks: {
          select: {
            status: true,
            dueDate: true,
            completedAt: true,
          },
        },
        starterMaterials: {
          select: {
            isProvided: true,
          },
        },
        documents: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            status: true,
          },
        },
      },
    })

    const now = new Date()
    const scores: StarterHealthScore[] = starters.map(starter => {
      const totalTasks = starter.tasks.length
      const completedTasks = starter.tasks.filter(t => t.status === 'COMPLETED').length
      const overdueTasks = starter.tasks.filter(t =>
        t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate) < now
      ).length

      const taskScore = totalTasks > 0
        ? Math.round(((completedTasks / totalTasks) * 70 + (totalTasks > 0 ? ((totalTasks - overdueTasks) / totalTasks) * 30 : 100)) )
        : 100

      const totalMaterials = starter.starterMaterials.length
      const providedMaterials = starter.starterMaterials.filter(m => m.isProvided).length
      const materialScore = totalMaterials > 0
        ? Math.round((providedMaterials / totalMaterials) * 100)
        : 100

      const totalDocs = starter.documents.length
      const signedDocs = starter.documents.filter(d => d.status === 'SIGNED').length
      const documentScore = totalDocs > 0
        ? Math.round((signedDocs / totalDocs) * 100)
        : 100

      let daysUntilStart: number | null = null
      let timelineScore = 100
      if (starter.startDate && !starter.isPendingBoarding) {
        const startDate = new Date(starter.startDate)
        daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilStart <= 0) {
          const pendingTasks = totalTasks - completedTasks
          timelineScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100
        } else if (daysUntilStart <= 7) {
          const progressNeeded = 0.8
          const currentProgress = totalTasks > 0 ? completedTasks / totalTasks : 1
          timelineScore = currentProgress >= progressNeeded
            ? 100
            : Math.round((currentProgress / progressNeeded) * 100)
        } else if (daysUntilStart <= 14) {
          const progressNeeded = 0.5
          const currentProgress = totalTasks > 0 ? completedTasks / totalTasks : 1
          timelineScore = currentProgress >= progressNeeded
            ? 100
            : Math.round((currentProgress / progressNeeded) * 100)
        }
      }

      const overall = Math.round(
        taskScore * 0.35 + materialScore * 0.25 + documentScore * 0.20 + timelineScore * 0.20
      )

      return {
        starterId: starter.id,
        overall,
        taskScore,
        materialScore,
        documentScore,
        timelineScore,
        level: calcLevel(overall),
        tasks: { completed: completedTasks, total: totalTasks, overdue: overdueTasks },
        materials: { provided: providedMaterials, total: totalMaterials },
        documents: { signed: signedDocs, total: totalDocs },
        daysUntilStart,
      }
    })

    const scoresMap: Record<string, StarterHealthScore> = {}
    for (const score of scores) {
      scoresMap[score.starterId] = score
    }

    return NextResponse.json(scoresMap)
  } catch (error) {
    console.error('Error fetching health scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
