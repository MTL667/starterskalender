import { NextRequest, NextResponse } from 'next/server'
import { can, requirePermission } from '@/lib/authz'
import { provisioningEngine, type ProvisioningOptions } from '@/lib/provisioning-engine'
import { resolveValidatedSku } from '@/lib/provisioning-license'
import { prisma } from '@/lib/prisma'

async function resolveProvisioningEntity(
  user: Awaited<ReturnType<typeof requirePermission>>,
  starterEntityId: string,
  provisioningEntityId: string | undefined
) {
  const targetEntityId = provisioningEntityId || starterEntityId

  const connection = await prisma.entraAppConnection.findUnique({
    where: { entityId: targetEntityId },
    select: { consentStatus: true },
  })

  if (!connection || connection.consentStatus !== 'healthy') {
    return { error: NextResponse.json({ error: 'No healthy Entra connection' }, { status: 400 }) } as const
  }

  if (targetEntityId !== starterEntityId && !can(user, 'starters:read', { entityId: targetEntityId })) {
    return { error: NextResponse.json({ error: 'No access to selected entity' }, { status: 403 }) } as const
  }

  return { targetEntityId } as const
}

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

  let body: ProvisioningOptions = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as ProvisioningOptions
    }
  } catch {
    body = {}
  }

  const resolved = await resolveProvisioningEntity(user, starter.entityId, body.provisioningEntityId)
  if ('error' in resolved) return resolved.error

  const options: ProvisioningOptions = {
    provisioningEntityId: resolved.targetEntityId,
  }

  if (body.licenseSkuId) {
    try {
      const sku = await resolveValidatedSku(resolved.targetEntityId, body.licenseSkuId)
      options.licenseSkuId = sku.skuId
      options.licenseSkuDisplayName = sku.skuDisplayName
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  try {
    const result = await provisioningEngine.startProvisioning(starterId, user.id, options)
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
      entityId: true,
    },
  })

  return NextResponse.json({ jobs })
}
