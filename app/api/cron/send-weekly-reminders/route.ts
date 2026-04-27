import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { 
  renderEmailTemplate,
  getWeeklyReminderVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'
import { verifyCronAuth } from '@/lib/cron-auth'
import { renderAllEntities, countByType, buildSubjectParts, renderSummaryBlocks, groupByEntity } from '@/lib/cron-email-helpers'

/**
 * Cron Job: Wekelijkse reminder - 1 week voor startdatum
 * 
 * Run dagelijks om 8:00 AM
 * Verstuurt reminders voor starters die over exact 7 dagen beginnen
 * 
 * Easypanel Cron: 0 8 * * *
 * 
 * Security: Requires CRON_SECRET via Authorization header or ?secret= query param
 */
export async function GET(req: Request) {
  // Verify authorization
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    // Detect of de vorige succesvolle run te lang geleden was (>25u bij een
    // dagelijkse schedule). Als dat zo is, stuur een in-app notificatie naar
    // alle admins zodat operationele stilval zichtbaar is.
    await notifyIfCronWasStale()

    // Check voor recipient filtering (optioneel - voor manuele triggers)
    const { searchParams } = new URL(req.url)
    const recipientsParam = searchParams.get('recipients')
    const selectedRecipients = recipientsParam
      ? recipientsParam.split(',').map(r => r.trim())
      : null
    // Bereken datum over 7 dagen
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const inSevenDays = new Date(today)
    inSevenDays.setDate(inSevenDays.getDate() + 7)
    const inEightDays = new Date(today)
    inEightDays.setDate(inEightDays.getDate() + 8)

    // Haal template op uit database
    let template = await prisma.emailTemplate.findUnique({
      where: { 
        type: 'WEEKLY_REMINDER',
      },
    })

    // Gebruik default template als er geen is
    if (!template || !template.isActive) {
      template = {
        id: 'default',
        type: 'WEEKLY_REMINDER',
        subject: DEFAULT_TEMPLATES.WEEKLY_REMINDER.subject,
        body: DEFAULT_TEMPLATES.WEEKLY_REMINDER.body,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      }
    }

    // Haal alle starters op die over 7 dagen starten (niet geannuleerd)
    const upcomingStarters = await prisma.starter.findMany({
      where: {
        startDate: {
          gte: inSevenDays,
          lt: inEightDays,
        },
        isCancelled: false,
        entityId: {
          not: null,
        },
      },
      include: {
        entity: true,
        fromEntity: { select: { name: true } },
      },
    })

    if (upcomingStarters.length === 0) {
      // Heartbeat-log zodat de health-check weet dat de cron wél gedraaid
      // heeft, ook als er geen starters waren om over te mailen.
      await prisma.emailLog.create({
        data: {
          type: 'WEEKLY_REMINDER',
          recipient: 'system',
          subject: 'No starters starting in 7 days',
          status: 'SENT',
          startersCount: 0,
        },
      })
      return NextResponse.json({
        message: 'No starters starting in 7 days',
        sent: 0,
      })
    }

    let emailsSent = 0
    const errors: string[] = []

    // Haal alle users op die weeklyReminder enabled hebben voor minimaal 1 entiteit
    const allUsers = await prisma.user.findMany({
      include: {
        notificationPreferences: {
          where: {
            weeklyReminder: true,
          },
          include: {
            entity: true,
          },
        },
        memberships: {
          include: {
            entity: true,
          },
        },
      },
    })

    // Voor elke user, verzamel starters van hun toegankelijke entiteiten
    for (const user of allUsers) {
      // Skip deze user als recipients gefilterd zijn en deze user niet in de lijst staat
      if (selectedRecipients && !selectedRecipients.includes(user.email)) {
        continue
      }
      // Bepaal welke entiteiten deze user mag zien
      let accessibleEntityIds: string[]
      
      if (user.legacyRole === 'HR_ADMIN' || user.legacyRole === 'GLOBAL_VIEWER') {
        accessibleEntityIds = user.notificationPreferences.map(p => p.entityId)
      } else {
        const preferencesMap = new Set(user.notificationPreferences.map(p => p.entityId))
        accessibleEntityIds = user.memberships
          .filter(m => preferencesMap.has(m.entityId))
          .map(m => m.entityId)
      }

      if (accessibleEntityIds.length === 0) {
        continue // Skip users zonder toegang of alle preferences disabled
      }

      // Filter starters voor deze user's toegankelijke entiteiten
      const userStarters = upcomingStarters.filter(s => 
        s.entityId && accessibleEntityIds.includes(s.entityId)
      )

      if (userStarters.length === 0) {
        continue // Geen starters voor deze user
      }

      try {
        const startersByEntity = groupByEntity(userStarters)
        const startersListHtml = renderAllEntities(userStarters)
        const counts = countByType(userStarters)
        const subjectParts = buildSubjectParts(counts)
        const summaryHtml = renderSummaryBlocks(counts)

        const subject = `🔔 ${subjectParts} volgende week`
        const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
          `<h2 style="color: #1f2937;">👋 Hallo ${user.name || user.email},</h2>` +
          `<p style="color: #4b5563; line-height: 1.6;">Dit is een herinnering voor volgende week:</p>` +
          summaryHtml +
          startersListHtml +
          `<p style="color: #4b5563; line-height: 1.6;">Zorg ervoor dat alle voorbereidingen getroffen zijn!</p>` +
          `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">` +
          `<p style="color: #9ca3af; font-size: 12px;">Je ontvangt deze email omdat je geabonneerd bent op wekelijkse reminders.<br/>Wijzig je voorkeuren in je profielinstellingen.</p>` +
          `</div>`

        await sendEmail({
          to: user.email,
          subject,
          html,
        })

        emailsSent++

        // Log email verzending
        await prisma.emailLog.create({
          data: {
            type: 'WEEKLY_REMINDER',
            recipient: user.email,
            recipientUserId: user.id,
            subject,
            startersCount: userStarters.length,
            entities: Object.keys(startersByEntity),
            status: 'SENT',
            metadata: {
              starterIds: userStarters.map(s => s.id),
              entityIds: Object.keys(startersByEntity),
            },
          },
        })

        // Log audit
        await logAudit({
          action: 'SEND_MAIL',
          actorId: 'SYSTEM',
          target: 'WEEKLY_REMINDER_DIGEST',
          meta: {
            type: 'WEEKLY_REMINDER',
            recipient: user.email,
            startersCount: userStarters.length,
            entities: Object.keys(startersByEntity),
          },
        })
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error)
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${user.email}: ${errorMsg}`)
        
        // Log gefaalde email
        try {
          await prisma.emailLog.create({
            data: {
              type: 'WEEKLY_REMINDER',
              recipient: user.email,
              recipientUserId: user.id,
              subject: 'Failed to send',
              status: 'FAILED',
              errorMessage: errorMsg,
            },
          })
        } catch (logError) {
          console.error('Failed to log email error:', logError)
        }
      }
    }

    return NextResponse.json({
      message: 'Weekly reminders sent',
      sent: emailsSent,
      starters: upcomingStarters.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in send-weekly-reminders cron:', error)
    return NextResponse.json(
      {
        error: 'Failed to send weekly reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

const STALE_THRESHOLD_HOURS = 25

async function notifyIfCronWasStale() {
  try {
    const lastSent = await prisma.emailLog.findFirst({
      where: { type: 'WEEKLY_REMINDER', status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    })

    if (!lastSent) return

    const hoursAgo = (Date.now() - lastSent.sentAt.getTime()) / 3_600_000
    if (hoursAgo <= STALE_THRESHOLD_HOURS) return

    const hoursRounded = Math.round(hoursAgo)

    // Stuur naar alle users met admin-rechten (bypassEntityScope system roles)
    const admins = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roleAssignments: {
          some: {
            role: { bypassEntityScope: true },
          },
        },
      },
      select: { id: true },
    })

    if (admins.length === 0) return

    // Voorkom spam: check of er al een recente CRON_STALE notificatie is (<24u)
    const recentNotif = await prisma.notification.findFirst({
      where: {
        type: 'CRON_STALE',
        createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) },
      },
    })
    if (recentNotif) return

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: 'CRON_STALE',
        title: 'Wekelijkse reminder cron was uitgevallen',
        message: `De wekelijkse reminder cron had ${hoursRounded}u niet gedraaid. Hij is zojuist weer opgestart. Controleer of de container-cron correct draait.`,
        linkUrl: '/admin',
      })),
    })

    console.warn(
      `⚠️ Cron staleness detected: weekly reminder was ${hoursRounded}h overdue. Notified ${admins.length} admins.`,
    )
  } catch (error) {
    console.error('Failed to check cron staleness:', error)
  }
}

