import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: { message: 'Token is required' } }, { status: 400 })
    }

    const candidate = await prisma.candidate.findFirst({
      where: { consentRenewalToken: token, deletedAt: null },
      select: {
        id: true,
        vacancy: { select: { entityId: true, entity: { select: { retentionDays: true } } } },
      },
    })

    if (!candidate) {
      return NextResponse.json({ error: { message: 'Invalid or expired token' } }, { status: 404 })
    }

    const retentionDays = candidate.vacancy.entity.retentionDays
    const newExpiry = new Date(Date.now() + retentionDays * 86400000)

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        retentionExpiresAt: newExpiry,
        retentionNotifiedAt: null,
        consentRenewalToken: null,
      },
    })

    await createAuditLog({
      action: 'CONSENT_RENEWED',
      target: candidate.id,
      meta: { newExpiresAt: newExpiry.toISOString() },
    })

    return NextResponse.json({ data: { renewed: true, expiresAt: newExpiry.toISOString() } })
  } catch (err) {
    console.error('Consent renewal error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
