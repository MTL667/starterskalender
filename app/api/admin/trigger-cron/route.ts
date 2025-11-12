import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'

/**
 * Admin API: Trigger Cron Job Manually
 * 
 * Allows admins to manually trigger cron jobs from the admin panel.
 * This bypasses the scheduled execution and triggers immediately.
 * 
 * Security:
 * - Requires HR_ADMIN role
 * - Uses CRON_SECRET internally to authenticate with cron endpoints
 */
export async function POST(req: Request) {
  try {
    // Verify admin authentication
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }
    const { endpoint } = await req.json()

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      )
    }

    // Validate endpoint
    const validEndpoints = [
      '/api/cron/send-weekly-reminders',
      '/api/cron/send-monthly-summary',
      '/api/cron/send-quarterly-summary',
      '/api/cron/send-yearly-summary',
    ]

    if (!validEndpoints.includes(endpoint)) {
      return NextResponse.json(
        { error: 'Invalid endpoint' },
        { status: 400 }
      )
    }

    // Get CRON_SECRET from environment
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('⚠️ CRON_SECRET not set! Cannot trigger cron job.')
      return NextResponse.json(
        { error: 'CRON_SECRET not configured. Please set this environment variable.' },
        { status: 500 }
      )
    }

    // Construct the full URL for the cron endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const fullUrl = `${baseUrl}${endpoint}`

    console.log(`🔧 Admin trigger: ${user.email} is manually triggering ${endpoint}`)

    // Call the cron endpoint with CRON_SECRET
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Cron job failed:', data)
      return NextResponse.json(
        {
          error: 'Cron job failed',
          details: data.error || data.message || 'Unknown error',
        },
        { status: response.status }
      )
    }

    console.log('✅ Cron job completed successfully:', {
      endpoint,
      emailsSent: data.emailsSent,
      triggeredBy: user.email,
    })

    return NextResponse.json({
      success: true,
      message: data.message || 'Cron job executed successfully',
      emailsSent: data.emailsSent,
      usersNotified: data.usersNotified,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error triggering cron job:', error)
    return NextResponse.json(
      {
        error: 'Failed to trigger cron job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

