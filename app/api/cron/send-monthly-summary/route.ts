import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import {
  renderEmailTemplate,
  getMonthlySummaryVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'

/**
 * Cron Job: Maandelijks overzicht
 * 
 * Run op 1e dag van maand om 9:00 AM
 * Verstuurt overzicht van alle starters van afgelopen maand
 * 
 * Easypanel Cron: 0 9 1 * *
 */
export async function GET(req: Request) {
  try {
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

    // Voor elke entiteit, verstuur summary
    for (const [entityId, data] of Object.entries(startersByEntity)) {
      // Haal users op met monthlySummary enabled
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
              monthlySummary: true,
            },
          },
        },
      })

      const eligibleUsers = usersWithAccess.filter(
        user =>
          user.role === 'HR_ADMIN' ||
          user.notificationPreferences.length > 0
      )

      // Verstuur email naar elke eligible user
      for (const user of eligibleUsers) {
        try {
          const variables = getMonthlySummaryVariables(
            user.name || user.email,
            user.email,
            data.entityName,
            month,
            year,
            data.starters.map(s => ({
              ...s,
              startDate: s.startDate,
            }))
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
              type: 'MONTHLY_SUMMARY',
              recipient: user.email,
              entityName: data.entityName,
              month,
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
      message: 'Monthly summaries sent',
      sent: emailsSent,
      month,
      year,
      totalStarters: starters.length,
      entities: Object.keys(startersByEntity).length,
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

