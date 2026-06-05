import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { provisioningEngine } from '@/lib/provisioning-engine'
import { prisma } from '@/lib/prisma'

export async function POST(
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

  let user
  try {
    user = await requirePermission('starters:update', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const connection = await prisma.entraAppConnection.findUnique({
    where: { entityId: starter.entityId },
    select: { consentStatus: true },
  })

  if (!connection || connection.consentStatus !== 'healthy') {
    return NextResponse.json({ error: 'No healthy Entra connection' }, { status: 400 })
  }

  try {
    const result = await provisioningEngine.startProvisioning(starterId, user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    if (err.message === 'Provisioning already in progress for this starter') {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(
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
    await requirePermission('starters:read', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const jobs = await prisma.provisioningJob.findMany({
    where: { starterId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      state: true,
      assignedLicenseType: true,
      error: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ jobs })
}
