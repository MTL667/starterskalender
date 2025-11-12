import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'

/**
 * Admin API: Cron Diagnostics
 * 
 * Returns diagnostic information about the cron job configuration
 * to help troubleshoot issues.
 */
export async function GET() {
  try {
    // Verify admin authentication
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Collect diagnostic information
    const diagnostics = {
      environment: {
        cronSecret: process.env.CRON_SECRET ? {
          configured: true,
          length: process.env.CRON_SECRET.length,
          preview: process.env.CRON_SECRET.substring(0, 10) + '...',
        } : {
          configured: false,
          error: 'CRON_SECRET environment variable not set',
        },
        nextAuthUrl: process.env.NEXTAUTH_URL || null,
        vercelUrl: process.env.VERCEL_URL || null,
        nodeEnv: process.env.NODE_ENV,
        sendgridConfigured: !!process.env.SENDGRID_API_KEY,
        sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || null,
      },
      endpoints: {
        weekly: '/api/cron/send-weekly-reminders',
        monthly: '/api/cron/send-monthly-summary',
        quarterly: '/api/cron/send-quarterly-summary',
        yearly: '/api/cron/send-yearly-summary',
      },
      baseUrl: process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000',
      recommendations: [] as string[],
    }

    // Add recommendations based on diagnostics
    if (!diagnostics.environment.cronSecret.configured) {
      diagnostics.recommendations.push('❌ CRON_SECRET niet ingesteld - Voeg deze toe aan environment variables')
    }

    if (!diagnostics.environment.nextAuthUrl && !diagnostics.environment.vercelUrl) {
      diagnostics.recommendations.push('⚠️ Geen NEXTAUTH_URL of VERCEL_URL ingesteld - Cron jobs kunnen localhost niet bereiken in productie')
    }

    if (!diagnostics.environment.sendgridConfigured) {
      diagnostics.recommendations.push('⚠️ SendGrid niet geconfigureerd - Emails kunnen niet verzonden worden')
    }

    if (diagnostics.recommendations.length === 0) {
      diagnostics.recommendations.push('✅ Alle configuraties zien er goed uit!')
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    console.error('Error getting diagnostics:', error)
    return NextResponse.json(
      {
        error: 'Failed to get diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

