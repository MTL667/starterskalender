import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { graphApiService } from '@/lib/graph-api-service'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params

  let user
  try {
    user = await requirePermission('admin:entities:manage')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { can } = await import('@/lib/authz')
  if (!can(user, 'admin:entities:manage', { entityId })) {
    return NextResponse.json({ error: 'No access to this entity' }, { status: 403 })
  }

  const connection = await prisma.entraAppConnection.findUnique({
    where: { entityId },
    select: { consentStatus: true },
  })

  if (!connection || connection.consentStatus !== 'healthy') {
    return NextResponse.json({ error: 'No healthy Entra connection for this entity' }, { status: 400 })
  }

  try {
    const skus = await graphApiService.getSubscribedSkus(entityId)

    const available = skus.map(sku => ({
      skuId: sku.skuId,
      displayName: sku.skuPartNumber,
      totalUnits: sku.prepaidUnits.enabled,
      consumedUnits: sku.consumedUnits,
      availableUnits: sku.prepaidUnits.enabled - sku.consumedUnits,
    }))

    return NextResponse.json({ skus: available })
  } catch (err: any) {
    console.error('Failed to fetch SKUs:', err.message)
    return NextResponse.json({ error: 'Failed to fetch available licenses from Microsoft' }, { status: 500 })
  }
}
