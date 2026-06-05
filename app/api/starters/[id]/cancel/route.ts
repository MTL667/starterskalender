import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendEmail } from '@/lib/email'
import { eventBus } from '@/lib/events'
import { getCurrentUser, hasEntityAccess } from '@/lib/auth-utils'
import { isHRAdmin } from '@/lib/rbac'
import { ROLE_ASSIGNMENTS_INCLUDE, toAuthorizedUser, visibleEntityIds } from '@/lib/authz'
import { handleStarterCancellation } from '@/lib/starter-lifecycle'

const CancelSchema = z.object({
  cancelReason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = CancelSchema.parse(body)

    // Get starter met entity info
    const starter = await prisma.starter.findUnique({
      where: { id },
      include: {
        entity: {
          include: {
            memberships: {
              include: {
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!starter) {
      return NextResponse.json({ error: 'Starter niet gevonden' }, { status: 404 })
    }

    const canCancel =
      isHRAdmin(user) ||
      (!!starter.entityId && (await hasEntityAccess(user, starter.entityId, true)))

    if (!canCancel) {
      return NextResponse.json({ error: 'Geen toestemming om te annuleren' }, { status: 403 })
    }

    // Update starter
    const updatedStarter = await prisma.starter.update({
      where: { id },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledBy: user.id,
        cancelReason: data.cancelReason,
      },
    })

    // Audit log
    await createAuditLog({
      actorId: user.id,
      action: 'CANCEL_STARTER',
      target: `Starter:${starter.id}`,
      meta: { 
        starterName: `${starter.firstName} ${starter.lastName}`, 
        entityName: starter.entity?.name,
        cancelReason: data.cancelReason 
      },
    })

    // Create IT cleanup task if starter was provisioned
    await handleStarterCancellation(id, user.id)

    // Verzamel alle email ontvangers
    const recipients: string[] = []

    const broadcastUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roleAssignments: {
          some: {
            role: {
              permissions: {
                some: {
                  permissionKey: { in: ['starters:read', 'admin:users:manage'] },
                },
              },
            },
          },
        },
      },
      include: ROLE_ASSIGNMENTS_INCLUDE,
    })
    for (const u of broadcastUsers) {
      if (visibleEntityIds(toAuthorizedUser(u), 'starters:read') === 'ALL') {
        recipients.push(u.email)
      }
    }

    // 3. Entity viewers/editors (via memberships)
    if (starter.entity) {
      const entityUsers = starter.entity.memberships.map(m => m.user.email)
      recipients.push(...entityUsers)

      // 4. Entity notifyEmails
      recipients.push(...starter.entity.notifyEmails)
    }

    // Verwijder duplicaten
    const uniqueRecipients = [...new Set(recipients)]

    // Verstuur emails
    if (uniqueRecipients.length > 0) {
      try {
        await sendEmail({
          to: uniqueRecipients,
          subject: `Starter Geannuleerd: ${starter.firstName} ${starter.lastName}`,
          html: `
            <h2>Starter is geannuleerd</h2>
            <p><strong>Naam:</strong> ${starter.firstName} ${starter.lastName}</p>
            <p><strong>Functie:</strong> ${starter.roleTitle || 'N/A'}</p>
            <p><strong>Entiteit:</strong> ${starter.entity?.name || 'N/A'}</p>
            <p><strong>Startdatum:</strong> ${starter.startDate ? new Date(starter.startDate).toLocaleDateString('nl-BE') : 'Nog niet gekend'}</p>
            ${data.cancelReason ? `<p><strong>Reden:</strong> ${data.cancelReason}</p>` : ''}
            <p><strong>Geannuleerd door:</strong> ${user.name || user.email}</p>
            <p><strong>Datum annulering:</strong> ${new Date().toLocaleDateString('nl-BE')}</p>
          `,
        })

        await createAuditLog({
          actorId: user.id,
          action: 'SEND_MAIL',
          target: 'CancellationNotification',
          meta: { 
            starterId: starter.id, 
            recipientCount: uniqueRecipients.length 
          },
        })
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError)
        // Don't fail the request if email fails
      }
    }

    if (starter.entityId) {
      eventBus.emit({ type: 'starter:updated', entityId: starter.entityId, payload: { starterId: starter.id } })
    }

    return NextResponse.json(updatedStarter)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.errors }, { status: 400 })
    }
    console.error('Error cancelling starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

