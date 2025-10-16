import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Health check endpoint voor Docker en monitoring
export async function GET() {
  try {
    // Check database connectie
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: (error as Error).message
    }, { status: 503 })
  }
}

