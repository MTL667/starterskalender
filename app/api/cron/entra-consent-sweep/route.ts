import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/cron-auth'
import { graphApiService, GraphAuthError, GraphTransientError } from '@/lib/graph-api-service'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const connections = await prisma.entraAppConnection.findMany({
    where: {
      encryptedPrivateKey: { not: null },
      certificateThumbprint: { not: null },
    },
    select: {
      id: true,
      entityId: true,
      consentStatus: true,
      certificateExpiry: true,
      entity: { select: { name: true } },
    },
  })

  const results = { checked: 0, healthy: 0, errors: 0, skipped: 0, expiryWarnings: 0 }

  for (const connection of connections) {
    results.checked++

    try {
      await graphApiService.validateConsent(connection.entityId)

      await prisma.entraAppConnection.update({
        where: { id: connection.id },
        data: { consentStatus: 'healthy', lastConsentCheck: new Date() },
      })
      results.healthy++

      if (connection.certificateExpiry) {
        const daysUntilExpiry = (new Date(connection.certificateExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          await prisma.entraAppConnection.update({
            where: { id: connection.id },
            data: { consentStatus: 'warning' },
          })
          results.expiryWarnings++
          await notifyAdminsOfExpiry(connection.entityId, connection.entity.name, connection.certificateExpiry)
        }
      }
    } catch (err) {
      if (err instanceof GraphAuthError) {
        const previousStatus = connection.consentStatus

        await prisma.entraAppConnection.update({
          where: { id: connection.id },
          data: { consentStatus: 'error', lastConsentCheck: new Date() },
        })
        results.errors++

        if (previousStatus !== 'error') {
          await notifyAdminsOfRevocation(connection.entityId, connection.entity.name)
        }
      } else if (err instanceof GraphTransientError) {
        results.skipped++
      } else {
        results.skipped++
        console.error(`Consent sweep unexpected error for entity ${connection.entityId}:`, err)
      }
    }
  }

  return NextResponse.json(results)
}

async function notifyAdminsOfRevocation(entityId: string, entityName: string) {
  const members = await prisma.membership.findMany({
    where: { entityId, canEdit: true },
    select: { userId: true },
  })

  const notifications = members.map((member) => ({
    userId: member.userId,
    type: 'ENTRA_CONSENT_REVOKED',
    title: `Entra ID consent ingetrokken: ${entityName}`,
    message: `De Entra ID verbinding voor ${entityName} is niet meer geldig. Verleen opnieuw admin consent in Azure Portal.`,
    linkUrl: `/admin/entities`,
  }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}

async function notifyAdminsOfExpiry(entityId: string, entityName: string, expiryDate: Date) {
  const members = await prisma.membership.findMany({
    where: { entityId, canEdit: true },
    select: { userId: true },
  })

  const formattedDate = expiryDate.toLocaleDateString('nl-NL')
  const notifications = members.map((member) => ({
    userId: member.userId,
    type: 'ENTRA_CERTIFICATE_EXPIRING',
    title: `Certificaat verloopt binnenkort: ${entityName}`,
    message: `Het Entra ID certificaat voor ${entityName} verloopt op ${formattedDate}. Genereer een nieuw keypair en upload het naar Azure Portal.`,
    linkUrl: `/admin/entities`,
  }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}
