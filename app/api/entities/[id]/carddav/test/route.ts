import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { decryptConfig, testConnection, type CardDavConfig } from '@/lib/carddav'
import { decrypt } from '@/lib/crypto'

const TestBodySchema = z.object({
  cardDavUrl: z.string().url().optional(),
  cardDavUsername: z.string().optional(),
  cardDavPassword: z.string().optional(),
  cardDavAddressBook: z.string().optional(),
}).optional()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()
    const { id } = await params

    const authUser = toAuthorizedUser(user)
    if (!can(authUser, 'carddav:configure')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = TestBodySchema.safeParse(body)
    const formData = parsed.success ? parsed.data : undefined

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

    const url = formData?.cardDavUrl || entity.cardDavUrl
    const username = formData?.cardDavUsername || entity.cardDavUsername
    const addressBook = formData?.cardDavAddressBook || entity.cardDavAddressBook
    const password = formData?.cardDavPassword
      || (entity.cardDavPasswordEnc ? decrypt(entity.cardDavPasswordEnc) : null)

    const missing: string[] = []
    if (!url) missing.push('Server URL')
    if (!username) missing.push('Gebruikersnaam')
    if (!password) missing.push('App wachtwoord')
    if (!addressBook) missing.push('Adresboek naam')

    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Ontbrekend: ${missing.join(', ')}`,
      })
    }

    const config: CardDavConfig = {
      url: url!,
      username: username!,
      password: password!,
      addressBook: addressBook!,
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
