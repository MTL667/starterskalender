import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-utils'
import { sendTestEmail } from '@/lib/email'

const TestEmailSchema = z.object({
  email: z.string().email(),
})

// POST - Send test email (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const data = TestEmailSchema.parse(body)

    await sendTestEmail(data.email)

    return NextResponse.json({ success: true, message: 'Test email sent' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: (error as Error).message },
      { status: 500 }
    )
  }
}

