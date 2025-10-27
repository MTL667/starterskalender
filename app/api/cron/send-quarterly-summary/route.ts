import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import {
  renderEmailTemplate,
  getQuarterlySummaryVariables,
  DEFAULT_TEMPLATES,
} from '@/lib/email-template-engine'
import { logAudit } from '@/lib/audit'

/**
 * Cron Job: Kwartaal overzicht
 * 
 * Run op 1e dag van nieuw kwartaal om 10:00 AM
 * Q1: 1 april, Q2: 1 juli, Q3: 1 oktober, Q4: 1 januari
 * 
 * Easypanel Cron: 0 10 1 1,4,7,10 *
 */
export async function GET(req: Request) {
  try {
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
      // Haal users op met quarterlySummary enabled
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
              quarterlySummary: true,
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
          const variables = getQuarterlySummaryVariables(
            user.name || user.email,
            user.email,
            data.entityName,
            quarter,
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
              type: 'QUARTERLY_SUMMARY',
              recipient: user.email,
              entityName: data.entityName,
              quarter,
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
      message: `Quarterly summaries sent for Q${quarter} ${year}`,
      sent: emailsSent,
      quarter,
      year,
      totalStarters: starters.length,
      entities: Object.keys(startersByEntity).length,
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

