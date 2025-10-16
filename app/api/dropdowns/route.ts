import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireAdmin } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/audit'

const DropdownOptionSchema = z.object({
  group: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

// GET - List dropdown options
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')

    const where: any = { isActive: true }
    if (group) {
      where.group = group
    }

    const options = await prisma.dropdownOption.findMany({
      where,
      orderBy: [{ group: 'asc' }, { order: 'asc' }, { label: 'asc' }],
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error fetching dropdown options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create dropdown option (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const data = DropdownOptionSchema.parse(body)

    const option = await prisma.dropdownOption.create({
      data,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `DropdownOption:${option.id}`,
      meta: { group: option.group, label: option.label },
    })

    return NextResponse.json(option, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating dropdown option:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

