import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

// PATCH /api/admin/system/settings - Update a system setting
export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const { key, value } = body

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'Invalid key' },
        { status: 400 }
      )
    }

    // Upsert the setting
    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value,
        updatedBy: user.id,
      },
      create: {
        key,
        value,
        updatedBy: user.id,
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error updating system setting:', error)
    return NextResponse.json(
      { error: 'Failed to update system setting' },
      { status: 500 }
    )
  }
}

