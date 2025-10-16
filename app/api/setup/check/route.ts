import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// Check of de applicatie al is opgezet (heeft entiteiten)
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check of er entiteiten zijn
    const entityCount = await prisma.entity.count()
    
    return NextResponse.json({
      needsSetup: entityCount === 0,
      isAdmin: user.role === 'HR_ADMIN',
    })
  } catch (error) {
    console.error('Error checking setup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

