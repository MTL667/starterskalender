import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/system/settings - Publiek toegankelijk (voor logo, company name, etc.)
export async function GET() {
  try {
    const settings = await prisma.systemSettings.findMany({
      select: {
        key: true,
        value: true,
      },
    })

    // Convert array to object for easier access
    const settingsObject = settings.reduce((acc: Record<string, string | null>, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string | null>)

    return NextResponse.json(settingsObject)
  } catch (error) {
    console.error('Error fetching system settings:', error)
    
    // Check if it's a Prisma error (table doesn't exist)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isPrismaError = errorMessage.includes('relation') || errorMessage.includes('does not exist')
    
    return NextResponse.json(
      { 
        error: isPrismaError 
          ? 'SystemSettings table does not exist. Run: npx prisma db push'
          : 'Failed to fetch system settings',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

