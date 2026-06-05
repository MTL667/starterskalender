import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params

  try {
    await requirePermission('entity:view', { entityId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const licenses = await prisma.licenseCache.findMany({
    where: { entityId },
    orderBy: { skuPartNumber: 'asc' },
    select: {
      skuPartNumber: true,
      displayName: true,
      totalUnits: true,
      consumedUnits: true,
      availableUnits: true,
      lastSyncedAt: true,
    },
  })

  return NextResponse.json({ licenses })
}
