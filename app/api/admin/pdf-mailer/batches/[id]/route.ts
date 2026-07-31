import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { runPdfMailBatch } from '@/lib/pdf-mail-batch-engine'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const batch = await prisma.pdfMailBatch.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortIndex: 'asc' } },
    },
  })

  if (!batch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Don't expose filesystem paths to the client
  const items = batch.items.map(({ pdfStoragePath: _, ...rest }) => rest)

  return NextResponse.json({ ...batch, items })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  let action = 'start'
  try {
    const body = await req.json()
    if (body?.action) action = body.action
  } catch {
    // empty body ok
  }

  const batch = await prisma.pdfMailBatch.findUnique({ where: { id } })
  if (!batch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (action === 'start') {
    if (!['DRAFT', 'FAILED'].includes(batch.status)) {
      return NextResponse.json(
        { error: `Cannot start batch in status ${batch.status}` },
        { status: 409 }
      )
    }
    runPdfMailBatch(id).catch(err => {
      console.error(`Pdf mail batch ${id} failed:`, err)
    })
    return NextResponse.json({ ok: true, status: 'SENDING' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
