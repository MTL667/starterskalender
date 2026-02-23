import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { filterStartersByRBAC } from '@/lib/rbac'

// GET - Fetch distinct employees from completed onboardings (for offboarding selection)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let where: any = {
      type: 'ONBOARDING',
      isCancelled: false,
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    where = filterStartersByRBAC(user, where)

    const starters = await prisma.starter.findMany({
      where,
      select: {
        id: true,
        name: true,
        language: true,
        roleTitle: true,
        region: true,
        phoneNumber: true,
        desiredEmail: true,
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      distinct: ['name'],
    })

    return NextResponse.json(starters)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
