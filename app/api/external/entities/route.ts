import { NextRequest, NextResponse } from 'next/server'
import { validateExternalApiKey } from '@/lib/external-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  if (!validateExternalApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const entities = await prisma.entity.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        jobRoles: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(entities)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
