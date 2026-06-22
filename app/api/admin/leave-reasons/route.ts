import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(1).max(200).transform(s => s.trim()),
})

export async function GET() {
  try {
    await requirePermission('offboarding:reasons:manage')

    const reasons = await prisma.leaveReason.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { starters: true } },
      },
    })

    return NextResponse.json(reasons)
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error fetching leave reasons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission('offboarding:reasons:manage')

    const body = await request.json()
    const data = CreateSchema.parse(body)

    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const existing = await prisma.leaveReason.findUnique({ where: { name: data.name } })
    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.leaveReason.update({
          where: { id: existing.id },
          data: { isActive: true },
        })
        return NextResponse.json(reactivated)
      }
      return NextResponse.json({ error: 'Reason already exists' }, { status: 409 })
    }

    const reason = await prisma.leaveReason.create({ data: { name: data.name } })
    return NextResponse.json(reason, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Reason already exists' }, { status: 409 })
    }
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error creating leave reason:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
