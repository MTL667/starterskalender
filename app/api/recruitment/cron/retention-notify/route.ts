import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { createAuditLog } from '@/lib/audit'
import { verifyCronAuth } from '@/lib/cron-auth'
import crypto from 'crypto'

export async function POST(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const now = new Date()

  const entities = await prisma.entity.findMany({
    select: { id: true, retentionNotifyDays: true },
  })

  let notified = 0

  for (const entity of entities) {
    const notifyThreshold = new Date(now.getTime() + entity.retentionNotifyDays * 86400000)

    const candidates = await prisma.candidate.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        retentionNotifiedAt: null,
        retentionExpiresAt: { lte: notifyThreshold, gt: now },
        vacancy: { entityId: entity.id },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        retentionExpiresAt: true,
      },
    })

    for (const candidate of candidates) {
      try {
        const token = crypto.randomUUID()
        const daysLeft = Math.ceil(((candidate.retentionExpiresAt?.getTime() ?? 0) - now.getTime()) / 86400000)
        const renewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/consent/renew?token=${token}`

        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { retentionNotifiedAt: now, consentRenewalToken: token },
        })

        await sendEmail({
          to: candidate.email,
          subject: `Uw gegevens worden over ${daysLeft} dagen verwijderd`,
          html: `
            <p>Beste ${candidate.firstName},</p>
            <p>Uw kandidaatgegevens worden over ${daysLeft} dagen automatisch verwijderd conform ons privacybeleid.</p>
            <p>Wilt u uw toestemming verlengen? <a href="${renewUrl}">Klik hier om uw gegevens te bewaren</a>.</p>
            <p>Als u niets doet, worden uw gegevens na ${daysLeft} dagen verwijderd.</p>
          `,
        })

        notified++
      } catch { /* notification is best-effort */ }
    }
  }

  return NextResponse.json({ data: { notified } })
}
