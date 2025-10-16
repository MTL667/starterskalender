import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Detailed readiness check - includes database connectivity
export async function GET() {
  const checks: any = {
    timestamp: new Date().toISOString(),
    app: 'ok',
    database: 'unknown',
    environment: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    }
  }

  try {
    // Check database connectie
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'connected'
    checks.status = 'ready'
    
    return NextResponse.json(checks)
  } catch (error) {
    checks.database = 'disconnected'
    checks.status = 'not_ready'
    checks.error = (error as Error).message
    
    return NextResponse.json(checks, { status: 503 })
  }
}

