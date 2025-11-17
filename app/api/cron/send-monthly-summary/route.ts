import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import {
  renderEmailTemplate,
  getMonthlySummaryVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * Cron Job: Maandelijks overzicht
 * 
 * Run op 1e dag van maand om 9:00 AM
 * Verstuurt overzicht van alle starters van afgelopen maand
 * 
 * Easypanel Cron: 0 9 1 * *
 * 
 * Security: Requires CRON_SECRET via Authorization header or ?secret= query param
 */
export async function GET(req: Request) {
  // Verify authorization
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    // Check voor recipient filtering (optioneel - voor manuele triggers)
    const { searchParams } = new URL(req.url)
    const recipientsParam = searchParams.get('recipients')
    const selectedRecipients = recipientsParam
      ? recipientsParam.split(',').map(r => r.trim())
      : null
    // Bereken eerste en laatste dag van vorige maand
    const now = new Date()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    lastDayLastMonth.setHours(23, 59, 59, 999)

    const month = firstDayLastMonth.getMonth() + 1
    const year = firstDayLastMonth.getFullYear()

    // Haal template op
    let template = await prisma.emailTemplate.findUnique({
      where: { type: 'MONTHLY_SUMMARY' },
    })

    if (!template || !template.isActive) {
      template = {
        id: 'default',
        type: 'MONTHLY_SUMMARY',
        subject: DEFAULT_TEMPLATES.MONTHLY_SUMMARY.subject,
        body: DEFAULT_TEMPLATES.MONTHLY_SUMMARY.body,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      }
    }

    // Haal alle starters op van vorige maand (niet geannuleerd)
    const starters = await prisma.starter.findMany({
      where: {
        startDate: {
          gte: firstDayLastMonth,
          lte: lastDayLastMonth,
        },
        isCancelled: false,
        entityId: {
          not: null,
        },
      },
      include: {
        entity: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    if (starters.length === 0) {
      return NextResponse.json({
        message: 'No starters in previous month',
        sent: 0,
      })
    }

    let emailsSent = 0
    const errors: string[] = []

    // Haal alle users op die monthlySummary enabled hebben
    const allUsers = await prisma.user.findMany({
      include: {
        notificationPreferences: {
          where: {
            monthlySummary: true,
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
      
      if (user.role === 'HR_ADMIN') {
        accessibleEntityIds = user.notificationPreferences.map(p => p.entityId)
      } else {
        const preferencesMap = new Set(user.notificationPreferences.map(p => p.entityId))
        accessibleEntityIds = user.memberships
          .filter(m => preferencesMap.has(m.entityId))
          .map(m => m.entityId)
      }

      if (accessibleEntityIds.length === 0) {
        continue
      }

      // Filter starters voor deze user's toegankelijke entiteiten
      const userStarters = starters.filter(s => 
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

        // Genereer HTML lijst
        const startersListHtml = Object.entries(startersByEntity)
          .map(([entityName, starters]) => {
            const starterItems = starters.map(s => {
              const flag = s.language === 'FR' ? '🇫🇷' : '🇳🇱'
              const roleHtml = s.roleTitle ? '<span style="color: #6b7280;">' + s.roleTitle + '</span><br/>' : ''
              const dateStr = new Date(s.startDate).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
              return '<li style="padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid #3b82f6; border-radius: 4px;"><strong>' + s.name + '</strong> ' + flag + '<br/>' + roleHtml + '<span style="color: #6b7280; font-size: 14px;">Start: ' + dateStr + '</span></li>'
            }).join('')
            return '<div style="margin-bottom: 20px;"><h3 style="color: #1f2937; margin-bottom: 10px;">' + entityName + ' (' + starters.length + ')</h3><ul style="list-style-type: none; padding: 0;">' + starterItems + '</ul></div>'
          }).join('')

        const monthName = new Date(year, month - 1, 1).toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })
        const entityNames = Object.keys(startersByEntity).join(', ')

        const subject = `📊 Maandoverzicht - ${userStarters.length} starters in ${monthName}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">📊 Maandoverzicht ${monthName}</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Hallo ${user.name || user.email},
            </p>
            
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0; color: #1e40af; font-size: 36px;">${userStarters.length}</h3>
              <p style="margin: 5px 0 0 0; color: #1e40af;">Nieuwe starters</p>
            </div>
            
            ${startersListHtml}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px;">
              Maandelijks overzicht voor ${entityNames}.
              <br/>
              Wijzig je voorkeuren in je profielinstellingen.
            </p>
          </div>
        `

        await sendEmail({
          to: user.email,
          subject,
          html,
        })

        emailsSent++

        // Log email verzending
        await prisma.emailLog.create({
          data: {
            type: 'MONTHLY_SUMMARY',
            recipient: user.email,
            recipientUserId: user.id,
            subject,
            startersCount: userStarters.length,
            entities: Object.keys(startersByEntity),
            status: 'SENT',
            metadata: {
              month,
              year,
              starterIds: userStarters.map(s => s.id),
            },
          },
        })

        // Log audit
        await logAudit({
          action: 'SEND_MAIL',
          actorId: 'SYSTEM',
          target: 'MONTHLY_SUMMARY_DIGEST',
          meta: {
            type: 'MONTHLY_SUMMARY',
            recipient: user.email,
            month,
            year,
            startersCount: userStarters.length,
            entities: entityNames.split(', '),
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
              type: 'MONTHLY_SUMMARY',
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
      message: 'Monthly summaries sent',
      sent: emailsSent,
      month,
      year,
      totalStarters: starters.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in send-monthly-summary cron:', error)
    return NextResponse.json(
      {
        error: 'Failed to send monthly summaries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

