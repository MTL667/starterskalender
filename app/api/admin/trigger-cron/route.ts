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
    const { endpoint, recipients } = await req.json()

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      )
    }

    // Recipients is optional - array van email adressen
    const selectedRecipients: string[] = recipients || []

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
        { 
          error: 'CRON_SECRET niet geconfigureerd', 
          details: 'Voeg CRON_SECRET toe aan je environment variables en rebuild de app.',
          debugInfo: 'Environment variable CRON_SECRET is missing'
        },
        { status: 500 }
      )
    }

    // Construct the full URL for the cron endpoint
    // Try multiple base URL strategies
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    // Remove trailing slash if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    
    // Add recipients as query param if provided
    let fullUrl = `${cleanBaseUrl}${endpoint}`
    if (selectedRecipients.length > 0) {
      const recipientsParam = encodeURIComponent(selectedRecipients.join(','))
      fullUrl += `?recipients=${recipientsParam}`
    }

    console.log(`🔧 Admin trigger: ${user.email} is manually triggering ${endpoint}`)
    console.log(`🌐 Full URL: ${fullUrl}`)
    console.log(`🔑 Using CRON_SECRET: ${cronSecret.substring(0, 10)}...`)
    if (selectedRecipients.length > 0) {
      console.log(`📧 Selected recipients: ${selectedRecipients.join(', ')}`)
    }

    // Call the cron endpoint with CRON_SECRET
    let response: Response
    let data: any

    try {
      response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 seconds
      })

      // Try to parse JSON, but handle non-JSON responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        console.error('❌ Non-JSON response:', text)
        data = { error: 'Invalid response format', rawResponse: text }
      }
    } catch (fetchError: any) {
      console.error('❌ Fetch error:', fetchError)
      
      return NextResponse.json(
        {
          error: 'Kan cron job niet bereiken',
          details: fetchError.message || 'Network error',
          debugInfo: {
            url: fullUrl,
            error: fetchError.name,
            message: fetchError.message,
            cause: fetchError.cause?.toString(),
          }
        },
        { status: 500 }
      )
    }

    if (!response.ok) {
      console.error('❌ Cron job failed:', {
        status: response.status,
        statusText: response.statusText,
        data,
      })
      
      return NextResponse.json(
        {
          error: 'Cron job gefaald',
          details: data.error || data.message || response.statusText || 'Unknown error',
          debugInfo: {
            status: response.status,
            statusText: response.statusText,
            endpoint,
            url: fullUrl,
            responseData: data,
          }
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
      message: data.message || 'Cron job uitgevoerd!',
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

