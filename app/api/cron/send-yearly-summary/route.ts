import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import {
  renderEmailTemplate,
  getYearlySummaryVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'
import { verifyCronAuth } from '@/lib/cron-auth'
import { renderAllEntities, countByType, buildSubjectParts, renderSummaryBlocks, groupByEntity } from '@/lib/cron-email-helpers'

/**
 * Cron Job: Jaarlijks overzicht
 * 
 * Run op 1 januari om 11:00 AM
 * Verstuurt overzicht van alle starters van vorig jaar
 * 
 * Easypanel Cron: 0 11 1 1 *
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
    const now = new Date()
    const year = now.getFullYear() - 1 // Vorig jaar

    // Bereken eerste en laatste dag van vorig jaar
    const firstDayYear = new Date(year, 0, 1)
    const lastDayYear = new Date(year, 11, 31, 23, 59, 59, 999)

    // Haal template op
    let template = await prisma.emailTemplate.findUnique({
      where: { type: 'YEARLY_SUMMARY' },
    })

    if (!template || !template.isActive) {
      template = {
        id: 'default',
        type: 'YEARLY_SUMMARY',
        subject: DEFAULT_TEMPLATES.YEARLY_SUMMARY.subject,
        body: DEFAULT_TEMPLATES.YEARLY_SUMMARY.body,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      }
    }

    // Haal alle starters op van vorig jaar
    const starters = await prisma.starter.findMany({
      where: {
        startDate: {
          gte: firstDayYear,
          lte: lastDayYear,
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
      orderBy: {
        startDate: 'asc',
      },
    })

    if (starters.length === 0) {
      return NextResponse.json({
        message: `No starters in ${year}`,
        sent: 0,
      })
    }

    let emailsSent = 0
    const errors: string[] = []

    // Haal alle users op die yearlySummary enabled hebben
    const allUsers = await prisma.user.findMany({
      include: {
        notificationPreferences: {
          where: {
            yearlySummary: true,
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
        const startersByEntity = groupByEntity(userStarters)
        const startersListHtml = renderAllEntities(userStarters)
        const counts = countByType(userStarters)
        const subjectParts = buildSubjectParts(counts)
        const summaryHtml = renderSummaryBlocks(counts)

        // Maandelijkse statistieken
        const byMonth = userStarters.reduce((acc, s) => {
          const month = s.startDate ? new Date(s.startDate).getMonth() : 0
          acc[month] = (acc[month] || 0) + 1
          return acc
        }, {} as Record<number, number>)

        const monthNames = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
        const statsMonthItems = monthNames.map((name, i) => {
          const count = byMonth[i] || 0
          return `<div style="text-align: center; padding: 10px; background: white; border-radius: 4px;"><div style="font-weight: bold; color: #3b82f6; font-size: 20px;">${count}</div><div style="font-size: 12px; color: #6b7280;">${name}</div></div>`
        }).join('')
        const statsHtml = `<div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin-top: 0; color: #1f2937;">📊 Per Maand</h3><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">${statsMonthItems}</div></div>`

        const entityNames = Object.keys(startersByEntity).join(', ')

        const subject = `🎉 Jaaroverzicht ${year} - ${subjectParts}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">🎉 Jaaroverzicht ${year}</h2>
            <p style="color: #4b5563; line-height: 1.6;">Hallo ${user.name || user.email},</p>
            <p style="color: #4b5563; line-height: 1.6;">Een terugblik op ${year}:</p>
            ${summaryHtml}
            ${statsHtml}
            <h3 style="color: #1f2937;">Overzicht ${year}:</h3>
            ${startersListHtml}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Jaaroverzicht voor ${entityNames}.<br/>
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
            type: 'YEARLY_SUMMARY',
            recipient: user.email,
            recipientUserId: user.id,
            subject,
            startersCount: userStarters.length,
            entities: Object.keys(startersByEntity),
            status: 'SENT',
            metadata: {
              year,
              starterIds: userStarters.map(s => s.id),
            },
          },
        })

        // Log audit
        await logAudit({
          action: 'SEND_MAIL',
          actorId: 'SYSTEM',
          target: 'YEARLY_SUMMARY_DIGEST',
          meta: {
            type: 'YEARLY_SUMMARY',
            recipient: user.email,
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
              type: 'YEARLY_SUMMARY',
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
      message: `Yearly summaries sent for ${year}`,
      sent: emailsSent,
      year,
      totalStarters: starters.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in send-yearly-summary cron:', error)
    return NextResponse.json(
      {
        error: 'Failed to send yearly summaries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

