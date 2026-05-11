import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { decryptConfig, testConnection } from '@/lib/carddav'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()
    const { id } = await params

    const authUser = toAuthorizedUser(user)
    if (!can(authUser, 'carddav:configure')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const entity = await prisma.entity.findUnique({
      where: { id },
      select: {
        cardDavEnabled: true,
        cardDavUrl: true,
        cardDavUsername: true,
        cardDavPasswordEnc: true,
        cardDavAddressBook: true,
      },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    let config
    try {
      config = decryptConfig(entity)
    } catch {
      return NextResponse.json({ success: false, error: 'Onvolledige CardDAV configuratie' })
    }

    const result = await testConnection(config)
    return NextResponse.json({
      success: result.success,
      error: result.error || undefined,
    })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('CardDAV test connection error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' })
  }
}
