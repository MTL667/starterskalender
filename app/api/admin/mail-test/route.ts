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

    console.log('[API] Sending test email to:', data.email)
    await sendTestEmail(data.email)
    console.log('[API] Test email sent successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Test email verzonden! Check je inbox.' 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Ongeldige email', 
        details: 'Voer een geldig emailadres in' 
      }, { status: 400 })
    }
    
    console.error('[API] Error sending test email:', error)
    
    const errorMessage = (error as any).message || 'Unknown error'
    const errorCode = (error as any).code
    
    console.error('[API] Error code:', errorCode)
    console.error('[API] Error message:', errorMessage)
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorCode ? `Error code: ${errorCode}` : undefined
      },
      { status: 500 }
    )
  }
}

