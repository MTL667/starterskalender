import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { bulkImportInspectorNumbers } from '@/lib/inspector-number'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: entityId } = await params
    const user = await requireAdmin()

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { inspectorNumberEnabled: true, name: true },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Entity niet gevonden' }, { status: 404 })
    }

    if (!entity.inspectorNumberEnabled) {
      return NextResponse.json(
        { error: 'Inspecteurnummer is niet geactiveerd voor deze entiteit' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { rows } = body

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Geen rijen opgegeven' }, { status: 400 })
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: 'Maximaal 1000 rijen per import' }, { status: 400 })
    }

    const parsed = rows.map((row: any) => ({
      firstName: String(row.firstName || '').trim(),
      lastName: String(row.lastName || '').trim(),
      inspectorNumber: parseInt(row.inspectorNumber),
    }))

    const invalid = parsed.filter(
      (r) => !r.firstName || !r.lastName || !Number.isInteger(r.inspectorNumber),
    )

    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `${invalid.length} rijen hebben ongeldige data (firstName, lastName en inspectorNumber zijn verplicht)` },
        { status: 400 },
      )
    }

    const results = await bulkImportInspectorNumbers(entityId, parsed, user.id)

    const imported = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      imported,
      failed: failed.length,
      errors: failed,
      total: rows.length,
    })
  } catch (error) {
    console.error('Error importing inspector numbers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
