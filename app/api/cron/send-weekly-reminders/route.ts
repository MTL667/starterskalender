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
      // Bepaal welke entiteiten deze user mag zien
      let accessibleEntityIds: string[]
      
      if (user.role === 'HR_ADMIN') {
        // HR_ADMIN ziet alle entiteiten met weeklyReminder enabled
        accessibleEntityIds = user.notificationPreferences.map(p => p.entityId)
      } else {
        // Andere users: alleen entiteiten met membership EN weeklyReminder enabled
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
        // Groepeer starters per entiteit voor overzicht
        const startersByEntity = userStarters.reduce((acc, starter) => {
          const entityName = starter.entity!.name
          if (!acc[entityName]) {
            acc[entityName] = []
          }
          acc[entityName].push(starter)
          return acc
        }, {} as Record<string, typeof userStarters>)

        // Genereer HTML lijst van starters gegroepeerd per entiteit
        const startersListHtml = Object.entries(startersByEntity)
          .map(([entityName, starters]) => {
            const starterItems = starters.map(s => {
              const flag = s.language === 'FR' ? '🇫🇷' : '🇳🇱'
              const roleHtml = s.roleTitle ? '<span style="color: #6b7280;">' + s.roleTitle + '</span><br/>' : ''
              const dateStr = new Date(s.startDate).toLocaleDateString('nl-BE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              return '<li style="padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px;"><strong>' + s.name + '</strong> ' + flag + '<br/>' + roleHtml + '<span style="color: #6b7280; font-size: 14px;">Start: ' + dateStr + '</span></li>'
            }).join('')
            return '<div style="margin-bottom: 20px;"><h3 style="color: #1f2937; margin-bottom: 10px;">' + entityName + '</h3><ul style="list-style-type: none; padding: 0;">' + starterItems + '</ul></div>'
          }).join('')

        // Custom template voor gecombineerde weekly reminder
        const starterWord = userStarters.length !== 1 ? 'starters' : 'starter'
        const beginWord = userStarters.length !== 1 ? 'beginnen' : 'begint'
        const subject = '🔔 ' + userStarters.length + ' ' + starterWord + ' ' + beginWord + ' volgende week'
        const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
          '<h2 style="color: #1f2937;">👋 Hallo ' + (user.name || user.email) + ',</h2>' +
          '<p style="color: #4b5563; line-height: 1.6;">Dit is een vriendelijke herinnering dat <strong>' + userStarters.length + ' ' + starterWord + '</strong> volgende week ' + beginWord + '.</p>' +
          startersListHtml +
          '<p style="color: #4b5563; line-height: 1.6;">Zorg ervoor dat alle voorbereidingen getroffen zijn voor een succesvolle onboarding!</p>' +
          '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">' +
          '<p style="color: #9ca3af; font-size: 12px;">Je ontvangt deze email omdat je geabonneerd bent op wekelijkse reminders.<br/>Wijzig je voorkeuren in je profielinstellingen.</p>' +
          '</div>'

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
        errors.push(`${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

