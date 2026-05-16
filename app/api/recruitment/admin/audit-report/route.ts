import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('recruitment:admin')

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const action = searchParams.get('action')
    const actorId = searchParams.get('actorId')
    const target = searchParams.get('target')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 100)
    const format = searchParams.get('format')

    const where: any = {}
    if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) }
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) }
    if (action) where.action = action
    if (actorId) where.actorId = actorId
    if (target) where.target = { contains: target }

    if (format === 'csv') {
      const entries = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000,
        include: { actor: { select: { name: true, email: true } } },
      })

      const csvRows = [
        'Timestamp,Action,Actor,Target,Metadata',
        ...entries.map(e => {
          const ts = e.createdAt.toISOString()
          const actorName = e.actor?.name ?? 'System'
          const meta = e.meta ? JSON.stringify(e.meta).replace(/"/g, '""') : ''
          return `"${ts}","${e.action}","${actorName}","${e.target ?? ''}","${meta}"`
        }),
      ]

      await createAuditLog({
        action: 'AUDIT_REPORT_EXPORTED',
        meta: { format: 'csv', filters: { dateFrom, dateTo, action, target }, rowCount: entries.length },
      })

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { id: true, name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      data: entries.map(e => ({
        id: e.id,
        action: e.action,
        actor: e.actor ?? { id: null, name: 'System' },
        target: e.target,
        meta: e.meta,
        createdAt: e.createdAt,
        integrityHash: e.integrityHash,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json({ error: { message: err.message } }, { status })
    }
    console.error('Audit report error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
