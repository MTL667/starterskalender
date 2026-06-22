import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { filterStartersByRBAC } from '@/lib/rbac'

// GET - Fetch distinct employees (onboarded or migrated, not cancelled) for offboarding/migration selection
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let where: any = {
      type: { in: ['ONBOARDING', 'MIGRATION'] },
      isCancelled: false,
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    where = filterStartersByRBAC(user, where)

    const starters = await prisma.starter.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        language: true,
        roleTitle: true,
        region: true,
        phoneNumber: true,
        desiredEmail: true,
        employmentType: true,
        companyName: true,
        vatNumber: true,
        companyAddress: true,
        legalForm: true,
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
      orderBy: { lastName: 'asc' },
      distinct: ['firstName', 'lastName'],
    })

    const result = starters.map(s => ({
      ...s,
      name: `${s.firstName} ${s.lastName}`,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
