import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Alleen de dagelijkse weekly-reminder monitoren — die is de canary voor
// crond: als die stilvalt, weten we dat de hele cron daemon niet draait.
// Monthly/quarterly/yearly hebben te lange intervallen om nuttig te monitoren.
const STALENESS_THRESHOLDS: Record<string, number> = {
  WEEKLY_REMINDER: 25, // dagelijks om 08:00 → 25u marge
}

type CronStatus = {
  type: string
  lastRun: string | null
  status: 'ok' | 'stale' | 'never_ran'
  hoursAgo: number | null
  thresholdHours: number
}

// GET /api/health/cron
// Publiek endpoint (geen auth) zodat externe monitoring (UptimeRobot, Easypanel
// health checks) het kan pollen. Geeft per cron-type de laatste succesvolle
// EmailLog terug + een overall health status.
export async function GET() {
  try {
    const now = Date.now()
    const results: CronStatus[] = []

    for (const [type, thresholdHours] of Object.entries(STALENESS_THRESHOLDS)) {
      const lastLog = await prisma.emailLog.findFirst({
        where: { type: type as any, status: 'SENT' },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      })

      if (!lastLog) {
        results.push({
          type,
          lastRun: null,
          status: 'never_ran',
          hoursAgo: null,
          thresholdHours,
        })
        continue
      }

      const hoursAgo = Math.round((now - lastLog.sentAt.getTime()) / 3_600_000 * 10) / 10

      results.push({
        type,
        lastRun: lastLog.sentAt.toISOString(),
        status: hoursAgo > thresholdHours ? 'stale' : 'ok',
        hoursAgo,
        thresholdHours,
      })
    }

    // "never_ran" is niet per se ongezond — maandelijkse/kwartaal/jaarlijkse crons
    // hebben misschien simpelweg nog niet hoeven draaien. Alleen "stale" (= eerder
    // wél gedraaid maar nu te lang geleden) is een echt probleem.
    const overallHealthy = results.every((r) => r.status !== 'stale')

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        healthy: overallHealthy,
        crons: results,
      },
      { status: overallHealthy ? 200 : 503 },
    )
  } catch (error) {
    console.error('Cron health check failed:', error)
    return NextResponse.json(
      { healthy: false, error: 'Database check failed' },
      { status: 503 },
    )
  }
}
