import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  try {
    const { emailId } = await params
    const user = await requirePermission('recruitment:write')

    const email = await prisma.linkedEmail.findUnique({
      where: { id: emailId },
      select: { id: true, userId: true, isPrivate: true },
    })

    if (!email) {
      return NextResponse.json(
        { error: { message: 'Email not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (email.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Only the syncing user can toggle privacy', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isPrivate } = body as { isPrivate?: boolean }

    if (typeof isPrivate !== 'boolean') {
      return NextResponse.json(
        { error: { message: 'isPrivate must be a boolean', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const updated = await prisma.linkedEmail.update({
      where: { id: emailId },
      data: {
        isPrivate,
        markedPrivateBy: isPrivate ? user.id : null,
      },
      select: { id: true, isPrivate: true },
    })

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Toggle email privacy error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
