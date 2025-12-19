import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

const MembershipSchema = z.object({
  entityId: z.string(),
  canEdit: z.boolean(),
})

// Get user memberships
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const memberships = await prisma.membership.findMany({
      where: { userId: id },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
    })

    return NextResponse.json(memberships)
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add membership
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = MembershipSchema.parse(body)

    const membership = await prisma.membership.create({
      data: {
        userId: id,
        entityId: data.entityId,
        canEdit: data.canEdit,
      },
      include: {
        entity: true,
      },
    })

    await createAuditLog({
      actorId: session.user.id,
      action: 'CREATE',
      target: `Membership:${membership.id}`,
      meta: { userId: id, entityId: data.entityId, canEdit: data.canEdit },
    })

    return NextResponse.json(membership)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.errors }, { status: 400 })
    }
    console.error('Error creating membership:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete membership
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const { searchParams } = new URL(request.url)
    const membershipId = searchParams.get('membershipId')

    if (!membershipId) {
      return NextResponse.json({ error: 'membershipId is required' }, { status: 400 })
    }

    await prisma.membership.delete({
      where: { id: membershipId },
    })

    await createAuditLog({
      actorId: session.user.id,
      action: 'DELETE',
      target: `Membership:${membershipId}`,
      meta: { userId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting membership:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

