import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendEmail } from '@/lib/email'

const CancelSchema = z.object({
  cancelReason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
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

    // Check permissions
    const userRole = session.user.role
    const canCancel = 
      userRole === 'HR_ADMIN' ||
      (userRole === 'ENTITY_EDITOR' && starter.entityId && 
       await prisma.membership.findFirst({
         where: { 
           userId: session.user.id, 
           entityId: starter.entityId,
           canEdit: true 
         }
       }))

    if (!canCancel) {
      return NextResponse.json({ error: 'Geen toestemming om te annuleren' }, { status: 403 })
    }

    // Update starter
    const updatedStarter = await prisma.starter.update({
      where: { id },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledBy: session.user.id,
        cancelReason: data.cancelReason,
      },
    })

    // Audit log
    await createAuditLog({
      actorId: session.user.id,
      action: 'CANCEL_STARTER',
      target: `Starter:${starter.id}`,
      meta: { 
        starterName: starter.name, 
        entityName: starter.entity?.name,
        cancelReason: data.cancelReason 
      },
    })

    // Verzamel alle email ontvangers
    const recipients: string[] = []

    // 1. HR_ADMIN users
    const hrAdmins = await prisma.user.findMany({
      where: { role: 'HR_ADMIN' },
      select: { email: true, name: true },
    })
    recipients.push(...hrAdmins.map(u => u.email))

    // 2. GLOBAL_VIEWER users
    const globalViewers = await prisma.user.findMany({
      where: { role: 'GLOBAL_VIEWER' },
      select: { email: true },
    })
    recipients.push(...globalViewers.map(u => u.email))

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
          subject: `Starter Geannuleerd: ${starter.name}`,
          html: `
            <h2>Starter is geannuleerd</h2>
            <p><strong>Naam:</strong> ${starter.name}</p>
            <p><strong>Functie:</strong> ${starter.roleTitle || 'N/A'}</p>
            <p><strong>Entiteit:</strong> ${starter.entity?.name || 'N/A'}</p>
            <p><strong>Startdatum:</strong> ${new Date(starter.startDate).toLocaleDateString('nl-BE')}</p>
            ${data.cancelReason ? `<p><strong>Reden:</strong> ${data.cancelReason}</p>` : ''}
            <p><strong>Geannuleerd door:</strong> ${session.user.name || session.user.email}</p>
            <p><strong>Datum annulering:</strong> ${new Date().toLocaleDateString('nl-BE')}</p>
          `,
        })

        await createAuditLog({
          actorId: session.user.id,
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

    return NextResponse.json(updatedStarter)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.errors }, { status: 400 })
    }
    console.error('Error cancelling starter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

