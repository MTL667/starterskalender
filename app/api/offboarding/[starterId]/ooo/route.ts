import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const OOO_SELECT = {
  oooMessageNl: true,
  oooMessageFr: true,
  oooMessageEn: true,
  oooGeneralMailAddress: true,
} as const

const trimToNull = (v: unknown) => {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed === '' ? null : trimmed
}

const UpdateOooSchema = z.object({
  oooMessageNl: z.preprocess(trimToNull, z.string().max(5000).nullable()),
  oooMessageFr: z.preprocess(trimToNull, z.string().max(5000).nullable()),
  oooMessageEn: z.preprocess(trimToNull, z.string().max(5000).nullable()),
  oooGeneralMailAddress: z.preprocess(trimToNull, z.string().email().max(256).nullable()),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true, ...OOO_SELECT },
  })

  if (!starter || !starter.entityId) {
    return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
  }

  try {
    await requirePermission('mail:offboarding', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return NextResponse.json({
    oooMessageNl: starter.oooMessageNl,
    oooMessageFr: starter.oooMessageFr,
    oooMessageEn: starter.oooMessageEn,
    oooGeneralMailAddress: starter.oooGeneralMailAddress,
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true },
  })

  if (!starter || !starter.entityId) {
    return NextResponse.json({ error: 'Starter not found' }, { status: 404 })
  }

  try {
    await requirePermission('mail:offboarding', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const result = UpdateOooSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const updated = await prisma.starter.update({
    where: { id: starterId },
    data: result.data,
    select: OOO_SELECT,
  })

  return NextResponse.json(updated)
}
