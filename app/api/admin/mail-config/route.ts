import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'

// GET /api/admin/mail-config - Get email configuration (server-side)
export async function GET() {
  try {
    await requireAdmin()

    const config = {
      apiKeyConfigured: !!process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL || process.env.MAIL_FROM || null,
      replyTo: process.env.MAIL_REPLY_TO || null,
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching mail config:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

