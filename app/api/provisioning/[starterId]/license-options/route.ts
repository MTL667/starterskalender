import { NextRequest, NextResponse } from 'next/server'
import { can, requirePermission } from '@/lib/authz'
import { graphApiService } from '@/lib/graph-api-service'
import { skuAvailableUnits } from '@/lib/provisioning-license'
import { prisma } from '@/lib/prisma'

/**
 * GET ?entityId=B — license mapping from starter entity A vs available SKUs on B.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  const { starterId } = await params
  const targetEntityId = req.nextUrl.searchParams.get('entityId')

  if (!targetEntityId) {
    return NextResponse.json({ error: 'entityId required' }, { status: 400 })
  }

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { entityId: true, roleTitle: true },
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

  if (targetEntityId !== starter.entityId && !can(user, 'starters:read', { entityId: targetEntityId })) {
    return NextResponse.json({ error: 'No access to selected entity' }, { status: 403 })
  }

  const connection = await prisma.entraAppConnection.findUnique({
    where: { entityId: targetEntityId },
    select: { consentStatus: true },
  })

  if (!connection || connection.consentStatus !== 'healthy') {
    return NextResponse.json({ error: 'No healthy Entra connection' }, { status: 400 })
  }

  let mappedSku: { skuId: string; skuDisplayName: string } | null = null
  if (starter.roleTitle) {
    const jobRole = await prisma.jobRole.findFirst({
      where: { entityId: starter.entityId, title: starter.roleTitle },
      include: { licenseConfig: true },
    })
    if (jobRole?.licenseConfig) {
      mappedSku = {
        skuId: jobRole.licenseConfig.skuId,
        skuDisplayName: jobRole.licenseConfig.skuDisplayName,
      }
    }
  }

  try {
    const skus = await graphApiService.getSubscribedSkus(targetEntityId)
    const availableSkus = skus
      .map(sku => ({
        skuId: sku.skuId,
        displayName: sku.skuPartNumber,
        availableUnits: skuAvailableUnits(sku),
      }))
      .filter(s => s.availableUnits > 0)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))

    let mappedSkuAvailable = false
    let mappedSkuStatus: 'available' | 'not_found' | 'no_capacity' | 'none' = 'none'

    if (mappedSku) {
      const target = skus.find(s => s.skuId === mappedSku!.skuId)
      if (!target) {
        mappedSkuStatus = 'not_found'
      } else if (skuAvailableUnits(target) > 0) {
        mappedSkuStatus = 'available'
        mappedSkuAvailable = true
      } else {
        mappedSkuStatus = 'no_capacity'
      }
    }

    return NextResponse.json({
      starterEntityId: starter.entityId,
      targetEntityId,
      mappedSku,
      mappedSkuAvailable,
      mappedSkuStatus,
      needsLicenseSelection: !mappedSkuAvailable,
      availableSkus,
    })
  } catch (err: any) {
    console.error('Failed to fetch license options:', err.message)
    return NextResponse.json({ error: 'Failed to fetch available licenses' }, { status: 500 })
  }
}
