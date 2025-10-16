import { NextRequest, NextResponse } from 'next/server'
import { runEmailReminderJob } from '@/lib/cron/email-reminder'

// Vercel Cron endpoint
export async function GET(request: NextRequest) {
  // Verify Vercel Cron Secret (optional but recommended)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runEmailReminderJob()
    return NextResponse.json({ success: true, message: 'Email reminder job completed' })
  } catch (error) {
    console.error('Email reminder job failed:', error)
    return NextResponse.json(
      { error: 'Job failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}

