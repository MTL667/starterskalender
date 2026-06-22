import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).transform(s => s.trim()).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const data = UpdateSchema.parse(body)

    const reason = await prisma.leaveReason.update({
      where: { id },
      data,
    })

    return NextResponse.json(reason)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Name already exists' }, { status: 409 })
    }
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error updating leave reason:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const reason = await prisma.leaveReason.findUnique({
      where: { id },
      include: { _count: { select: { starters: true } } },
    })

    if (!reason) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (reason._count.starters > 0) {
      return NextResponse.json(
        { error: 'Cannot delete reason that is still in use. Deactivate it instead.' },
        { status: 409 }
      )
    }

    await prisma.leaveReason.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Error deleting leave reason:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
