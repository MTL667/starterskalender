import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { graphApiService } from '@/lib/graph-api-service'
import { prisma } from '@/lib/prisma'
import { encryptEntra } from '@/lib/encryption'

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

  try {
    await requirePermission('starters:update', { entityId: starter.entityId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const successfulJob = await prisma.provisioningJob.findFirst({
    where: { starterId, state: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
    select: { id: true, graphUserId: true, entityId: true },
  })

  if (!successfulJob?.graphUserId) {
    return NextResponse.json({ error: 'No provisioned user found' }, { status: 400 })
  }

  try {
    const { token } = await graphApiService.getAuthenticatedClient(successfulJob.entityId)

    const tapRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${successfulJob.graphUserId}/authentication/temporaryAccessPassMethods`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUsableOnce: true, lifetimeInMinutes: 60 }),
      }
    )

    if (!tapRes.ok) {
      const body = await tapRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: body.error?.message || `TAP creation failed: ${tapRes.status}` },
        { status: tapRes.status }
      )
    }

    const tapData = await tapRes.json()

    await prisma.provisioningJob.update({
      where: { id: successfulJob.id },
      data: { temporaryPassword: encryptEntra(tapData.temporaryAccessPass) },
    })

    return NextResponse.json({ temporaryAccessPass: tapData.temporaryAccessPass })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create TAP' }, { status: 500 })
  }
}
