import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user || !isHRAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const action = searchParams.get('action')
    const search = searchParams.get('search')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Prisma.AuditLogWhereInput = {}

    if (action) {
      where.action = action
    }

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    if (search) {
      where.OR = [
        { target: { contains: search, mode: 'insensitive' } },
        { actor: { name: { contains: search, mode: 'insensitive' } } },
        { actor: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
