import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendEmail } from '@/lib/email'
import { eventBus } from '@/lib/events'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: { message: 'Token is required' } }, { status: 400 })
    }

    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { verificationToken: token },
          { consentRenewalToken: token },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        vacancy: {
          select: {
            id: true,
            entityId: true,
            createdById: true,
          },
        },
      },
    })

    if (!candidate) {
      return NextResponse.json({ error: { message: 'Invalid token or candidate not found' } }, { status: 404 })
    }

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        status: 'RETENTION_EXPIRED',
        deletedAt: new Date(),
        verificationToken: null,
        consentRenewalToken: null,
      },
    })

    await createAuditLog({
      action: 'CANDIDATE_ERASURE_REQUESTED',
      target: candidate.id,
      meta: { mechanism: 'self-service' },
    })

    try {
      await sendEmail({
        to: candidate.email,
        subject: 'Uw gegevens worden verwijderd',
        html: `
          <p>Beste ${candidate.firstName},</p>
          <p>Uw verzoek tot verwijdering van uw gegevens is ontvangen en wordt verwerkt.</p>
          <p>Uw persoonlijke gegevens worden binnen 30 dagen definitief verwijderd.</p>
        `,
      })
    } catch { /* email is best-effort */ }

    if (candidate.status === 'ACTIVE' && candidate.vacancy.createdById) {
      try {
        await prisma.notification.create({
          data: {
            userId: candidate.vacancy.createdById,
            type: 'CANDIDATE_ERASURE_REQUESTED',
            title: 'Kandidaat heeft verwijdering aangevraagd',
            message: `${candidate.firstName} ${candidate.lastName} heeft verwijdering van alle gegevens aangevraagd.`,
            linkUrl: `/recruitment/vacatures/${candidate.vacancy.id}`,
          },
        })
        eventBus.emit({ type: 'notification:new', entityId: '*', payload: { userId: candidate.vacancy.createdById } })
      } catch { /* notification is non-critical */ }
    }

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('Erasure request error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
