import { NextRequest, NextResponse } from 'next/server'
import { can, requirePermission } from '@/lib/authz'
import { provisioningEngine, type ProvisioningOptions } from '@/lib/provisioning-engine'
import { resolveValidatedSku } from '@/lib/provisioning-license'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params

  let body: { jobId?: string } & ProvisioningOptions
  try {
    const parsed = await req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    body = parsed as { jobId?: string } & ProvisioningOptions
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { jobId, provisioningEntityId, licenseSkuId } = body

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

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

  const failedJob = await prisma.provisioningJob.findUnique({
    where: { id: jobId },
    select: { starterId: true, entityId: true },
  })

  if (!failedJob || failedJob.starterId !== starterId) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const targetEntityId = provisioningEntityId || failedJob.entityId

  const connection = await prisma.entraAppConnection.findUnique({
    where: { entityId: targetEntityId },
    select: { consentStatus: true },
  })

  if (!connection || connection.consentStatus !== 'healthy') {
    return NextResponse.json({ error: 'No healthy Entra connection' }, { status: 400 })
  }

  if (targetEntityId !== starter.entityId && !can(user, 'starters:read', { entityId: targetEntityId })) {
    return NextResponse.json({ error: 'No access to selected entity' }, { status: 403 })
  }

  let validatedLicense: { licenseSkuId?: string; licenseSkuDisplayName?: string } = {}
  if (licenseSkuId) {
    try {
      const sku = await resolveValidatedSku(targetEntityId, licenseSkuId)
      validatedLicense = { licenseSkuId: sku.skuId, licenseSkuDisplayName: sku.skuDisplayName }
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  try {
    const result = await provisioningEngine.retryProvisioning(jobId, user.id, {
      provisioningEntityId: targetEntityId,
      ...validatedLicense,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    if (
      err.message === 'Provisioning already in progress for this starter' ||
      err.message === 'Can only retry a failed provisioning job'
    ) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
