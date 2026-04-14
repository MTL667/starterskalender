import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { isMaterialManager } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMaterialManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const materialFilter = searchParams.get('materialId')
    const entityFilter = searchParams.get('entityId')
    const overdueOnly = searchParams.get('overdue') === '1'

    const where: any = {
      starter: {
        isCancelled: false,
      },
    }

    if (statusFilter) {
      where.status = statusFilter
    }

    if (materialFilter) {
      where.materialId = materialFilter
    }

    if (entityFilter) {
      where.starter = { ...where.starter, entityId: entityFilter }
    }

    if (overdueOnly) {
      where.status = 'ORDERED'
      where.expectedDeliveryDate = { lt: new Date() }
    }

    const materials = await prisma.starterMaterial.findMany({
      where,
      include: {
        material: true,
        starter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            startDate: true,
            entityId: true,
            entity: { select: { id: true, name: true, colorHex: true } },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { expectedDeliveryDate: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    const statusCounts = await prisma.starterMaterial.groupBy({
      by: ['status'],
      where: {
        starter: { isCancelled: false },
      },
      _count: { status: true },
    })

    const overdueMaterials = await prisma.starterMaterial.count({
      where: {
        status: 'ORDERED',
        expectedDeliveryDate: { lt: new Date() },
        starter: { isCancelled: false },
      },
    })

    return NextResponse.json({
      materials,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {} as Record<string, number>),
      overdueCount: overdueMaterials,
    })
  } catch (error) {
    console.error('Error fetching materials dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
