import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import {
  renderEmailTemplate,
  getQuarterlySummaryVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'
import { verifyCronAuth } from '@/lib/cron-auth'
import { renderAllEntities, countByType, buildSubjectParts, renderSummaryBlocks, groupByEntity } from '@/lib/cron-email-helpers'

/**
 * Cron Job: Kwartaal overzicht
 * 
 * Run op 1e dag van nieuw kwartaal om 10:00 AM
 * Q1: 1 april, Q2: 1 juli, Q3: 1 oktober, Q4: 1 januari
 * 
 * Easypanel Cron: 0 10 1 1,4,7,10 *
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
    const currentMonth = now.getMonth() + 1 // 1-12
    
    // Bepaal vorig kwartaal
    let quarter: number
    let year = now.getFullYear()

    if (currentMonth <= 3) {
      // We zijn in Q1, vorig kwartaal was Q4 van vorig jaar
      quarter = 4
      year = year - 1
    } else if (currentMonth <= 6) {
      quarter = 1
    } else if (currentMonth <= 9) {
      quarter = 2
    } else {
      quarter = 3
    }

    // Bereken eerste en laatste dag van het kwartaal
    const quarterStartMonth = (quarter - 1) * 3 // 0, 3, 6, 9
    const firstDayQuarter = new Date(year, quarterStartMonth, 1)
    const lastDayQuarter = new Date(year, quarterStartMonth + 3, 0)
    lastDayQuarter.setHours(23, 59, 59, 999)

    // Haal template op
    let template = await prisma.emailTemplate.findUnique({
      where: { type: 'QUARTERLY_SUMMARY' },
    })

    if (!template || !template.isActive) {
      template = {
        id: 'default',
        type: 'QUARTERLY_SUMMARY',
        subject: DEFAULT_TEMPLATES.QUARTERLY_SUMMARY.subject,
        body: DEFAULT_TEMPLATES.QUARTERLY_SUMMARY.body,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      }
    }

    // Haal alle starters op van vorig kwartaal
    const starters = await prisma.starter.findMany({
      where: {
        startDate: {
          gte: firstDayQuarter,
          lte: lastDayQuarter,
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
        message: `No starters in Q${quarter} ${year}`,
        sent: 0,
      })
    }

    let emailsSent = 0
    const errors: string[] = []

    // Haal alle users op die quarterlySummary enabled hebben
    const allUsers = await prisma.user.findMany({
      include: {
        notificationPreferences: {
          where: {
            quarterlySummary: true,
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
      
      if (user.role === 'HR_ADMIN' || user.role === 'GLOBAL_VIEWER') {
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
        const entityNames = Object.keys(startersByEntity).join(', ')

        const subject = `📈 Kwartaaloverzicht Q${quarter} ${year} - ${subjectParts}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">📈 Kwartaaloverzicht Q${quarter} ${year}</h2>
            <p style="color: #4b5563; line-height: 1.6;">Hallo ${user.name || user.email},</p>
            ${summaryHtml}
            ${startersListHtml}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Kwartaaloverzicht voor ${entityNames}.<br/>
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
            type: 'QUARTERLY_SUMMARY',
            recipient: user.email,
            recipientUserId: user.id,
            subject,
            startersCount: userStarters.length,
            entities: Object.keys(startersByEntity),
            status: 'SENT',
            metadata: {
              quarter,
              year,
              starterIds: userStarters.map(s => s.id),
            },
          },
        })

        // Log audit
        await logAudit({
          action: 'SEND_MAIL',
          actorId: 'SYSTEM',
          target: 'QUARTERLY_SUMMARY_DIGEST',
          meta: {
            type: 'QUARTERLY_SUMMARY',
            recipient: user.email,
            quarter,
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
              type: 'QUARTERLY_SUMMARY',
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
      message: `Quarterly summaries sent for Q${quarter} ${year}`,
      sent: emailsSent,
      quarter,
      year,
      totalStarters: starters.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in send-quarterly-summary cron:', error)
    return NextResponse.json(
      {
        error: 'Failed to send quarterly summaries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

