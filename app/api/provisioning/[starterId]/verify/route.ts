import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { graphApiService } from '@/lib/graph-api-service'
import { prisma } from '@/lib/prisma'

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

  const successfulJob = await prisma.provisioningJob.findFirst({
    where: { starterId, state: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
    select: { graphUserId: true, entityId: true },
  })

  if (!successfulJob?.graphUserId) {
    return NextResponse.json({ exists: false, provisioned: false })
  }

  try {
    const { token } = await graphApiService.getAuthenticatedClient(successfulJob.entityId)
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${successfulJob.graphUserId}?$select=id,displayName`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.ok) {
      return NextResponse.json({ exists: true, provisioned: true })
    }

    if (res.status === 404) {
      return NextResponse.json({ exists: false, provisioned: true })
    }

    return NextResponse.json({ exists: false, provisioned: true, checkFailed: true })
  } catch {
    return NextResponse.json({ exists: false, provisioned: true, checkFailed: true })
  }
}
