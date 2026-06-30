import { NextRequest, NextResponse } from 'next/server'
import { validateExternalApiKey } from '@/lib/external-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  if (!validateExternalApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const starters = await prisma.starter.findMany({
      where: {
        isCancelled: false,
        entity: { isActive: true },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        language: true,
        desiredEmail: true,
        roleTitle: true,
        type: true,
        startDate: true,
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ entity: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
    })

    const result = starters.map(s => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      language: s.language,
      email: s.desiredEmail || null,
      jobRole: s.roleTitle || null,
      type: s.type,
      startDate: s.startDate,
      entity: s.entity ? { id: s.entity.id, name: s.entity.name } : null,
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
