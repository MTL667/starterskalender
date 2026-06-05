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

  const status = await prisma.graphApiStatus.findUnique({
    where: { entityId },
    select: { isReachable: true, lastCheckAt: true, lastError: true },
  })

  if (!status) {
    return NextResponse.json({ isReachable: true, lastCheckAt: null })
  }

  return NextResponse.json(status)
}
