import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireAdmin()

    const [materials, jobRoles] = await Promise.all([
      prisma.material.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      }),
      prisma.jobRole.findMany({
        where: { isActive: true },
        include: {
          entity: { select: { name: true } },
          materials: {
            include: { material: true },
          },
        },
        orderBy: [{ entity: { name: 'asc' } }, { order: 'asc' }, { title: 'asc' }],
      }),
    ])

    return NextResponse.json({ materials, jobRoles })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching material matrix:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
