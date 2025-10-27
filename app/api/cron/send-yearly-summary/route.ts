import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import {
  renderEmailTemplate,
  getYearlySummaryVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'

/**
 * Cron Job: Jaarlijks overzicht
 * 
 * Run op 1 januari om 11:00 AM
 * Verstuurt overzicht van alle starters van vorig jaar
 * 
 * Easypanel Cron: 0 11 1 1 *
 */
export async function GET(req: Request) {
  try {
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

    // Groepeer per entiteit
    const startersByEntity = starters.reduce((acc, starter) => {
      const entityId = starter.entityId!
      if (!acc[entityId]) {
        acc[entityId] = {
          entityName: starter.entity!.name,
          starters: [],
        }
      }
      acc[entityId].starters.push(starter)
      return acc
    }, {} as Record<string, { entityName: string; starters: typeof starters }>)

    // Genereer optionele stats HTML per entiteit
    const generateStatsHtml = (starters: typeof starters) => {
      // Groepeer per maand
      const byMonth = starters.reduce((acc, s) => {
        const month = new Date(s.startDate).getMonth()
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      const monthNames = [
        'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun',
        'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
      ]

      return `
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">📊 Statistieken per Maand</h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            ${monthNames.map((name, i) => `
              <div style="text-align: center; padding: 10px; background: white; border-radius: 4px;">
                <div style="font-weight: bold; color: #3b82f6; font-size: 20px;">${byMonth[i] || 0}</div>
                <div style="font-size: 12px; color: #6b7280;">${name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }

    // Voor elke entiteit, verstuur summary
    for (const [entityId, data] of Object.entries(startersByEntity)) {
      // Haal users op met yearlySummary enabled
      const usersWithAccess = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'HR_ADMIN' },
            {
              memberships: {
                some: { entityId },
              },
            },
          ],
        },
        include: {
          notificationPreferences: {
            where: {
              entityId,
              yearlySummary: true,
            },
          },
        },
      })

      const eligibleUsers = usersWithAccess.filter(
        user =>
          user.role === 'HR_ADMIN' ||
          user.notificationPreferences.length > 0
      )

      const statsHtml = generateStatsHtml(data.starters)

      // Verstuur email naar elke eligible user
      for (const user of eligibleUsers) {
        try {
          const variables = getYearlySummaryVariables(
            user.name || user.email,
            user.email,
            data.entityName,
            year,
            data.starters.map(s => ({
              ...s,
              startDate: s.startDate,
            })),
            statsHtml
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
            target: `Entity:${entityId}`,
            meta: {
              type: 'YEARLY_SUMMARY',
              recipient: user.email,
              entityName: data.entityName,
              year,
              startersCount: data.starters.length,
            },
          })
        } catch (error) {
          console.error(`Failed to send email to ${user.email}:`, error)
          errors.push(`${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    return NextResponse.json({
      message: `Yearly summaries sent for ${year}`,
      sent: emailsSent,
      year,
      totalStarters: starters.length,
      entities: Object.keys(startersByEntity).length,
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

