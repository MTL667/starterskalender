import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { 
  renderEmailTemplate,
  getWeeklyReminderVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'

/**
 * Cron Job: Wekelijkse reminder - 1 week voor startdatum
 * 
 * Run dagelijks om 8:00 AM
 * Verstuurt reminders voor starters die over exact 7 dagen beginnen
 * 
 * Easypanel Cron: 0 8 * * *
 */
export async function GET(req: Request) {
  try {
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
      },
    })

    if (upcomingStarters.length === 0) {
      return NextResponse.json({
        message: 'No starters starting in 7 days',
        sent: 0,
      })
    }

    let emailsSent = 0
    const errors: string[] = []

    // Groepeer per entiteit
    const startersByEntity = upcomingStarters.reduce((acc, starter) => {
      const entityId = starter.entityId!
      if (!acc[entityId]) {
        acc[entityId] = []
      }
      acc[entityId].push(starter)
      return acc
    }, {} as Record<string, typeof upcomingStarters>)

    // Voor elke entiteit, haal users op met weeklyReminder enabled
    for (const [entityId, starters] of Object.entries(startersByEntity)) {
      // Haal alle users op die:
      // 1. Toegang hebben tot deze entiteit (via membership of HR_ADMIN)
      // 2. weeklyReminder enabled hebben
      const usersWithAccess = await prisma.user.findMany({
        where: {
          OR: [
            {
              role: 'HR_ADMIN', // HR_ADMIN krijgt altijd notifications
            },
            {
              memberships: {
                some: {
                  entityId,
                },
              },
            },
          ],
        },
        include: {
          notificationPreferences: {
            where: {
              entityId,
              weeklyReminder: true,
            },
          },
          memberships: {
            where: {
              entityId,
            },
          },
        },
      })

      // Filter: alleen users met actieve preference OF HR_ADMIN
      const eligibleUsers = usersWithAccess.filter(
        user =>
          user.role === 'HR_ADMIN' ||
          user.notificationPreferences.length > 0
      )

      // Verstuur email naar elke eligible user voor elke starter
      for (const user of eligibleUsers) {
        for (const starter of starters) {
          try {
            const variables = getWeeklyReminderVariables(
              user.name || user.email,
              user.email,
              {
                ...starter,
                startDate: starter.startDate,
              }
            )

            const subject = renderEmailTemplate(template.subject, variables)
            const html = renderEmailTemplate(template.body, variables)

            await sendEmail({
              to: user.email,
              subject,
              html,
            })

            emailsSent++

            // Log audit
            await logAudit({
              action: 'SEND_MAIL',
              actorId: 'SYSTEM',
              target: `Starter:${starter.id}`,
              meta: {
                type: 'WEEKLY_REMINDER',
                recipient: user.email,
                starter: starter.name,
                startDate: starter.startDate,
              },
            })
          } catch (error) {
            console.error(`Failed to send email to ${user.email}:`, error)
            errors.push(`${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
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

