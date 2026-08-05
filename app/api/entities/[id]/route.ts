import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { createAuditLog } from '@/lib/audit'
import { encrypt } from '@/lib/crypto'
import { shouldSkipReadWipe } from '@/lib/carddav'

const optionalUrl = z
  .union([z.string().url(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' ? null : v))

const optionalNonEmpty = z
  .union([z.string().min(1), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' ? null : v))

const UpdateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
  inspectorNumberEnabled: z.boolean().optional(),
  inspectorNumberStart: z.number().int().positive().optional(),
  inspectorNumberLabel: z.string().min(1).optional(),
  cardDavEnabled: z.boolean().optional(),
  cardDavUrl: z.string().url().nullable().optional(),
  cardDavUsername: z.string().nullable().optional(),
  cardDavPassword: z.string().nullable().optional(),
  cardDavAddressBook: z.string().nullable().optional(),
  cardDavReadEnabled: z.boolean().optional(),
  cardDavReadUrl: optionalUrl,
  cardDavReadUsername: optionalNonEmpty,
  cardDavReadPassword: z.string().nullable().optional(),
})

const CARDDAV_FIELDS = [
  'cardDavEnabled',
  'cardDavUrl',
  'cardDavUsername',
  'cardDavPassword',
  'cardDavAddressBook',
  'cardDavReadEnabled',
  'cardDavReadUrl',
  'cardDavReadUsername',
  'cardDavReadPassword',
] as const

// PATCH - Update entity (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAdmin()

    const body = await request.json()
    const data = UpdateEntitySchema.parse(body)

    const hasCardDavFields = CARDDAV_FIELDS.some((f) => f in body)
    if (hasCardDavFields) {
      const authUser = toAuthorizedUser(user)
      if (!can(authUser, 'carddav:configure')) {
        return NextResponse.json({ error: 'Forbidden: carddav:configure vereist' }, { status: 403 })
      }
    }

    const existing = await prisma.entity.findUnique({
      where: { id },
      select: {
        cardDavAddressBook: true,
        cardDavReadPasswordEnc: true,
        cardDavReadUrl: true,
        cardDavReadUsername: true,
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { ...data }
    delete updateData.cardDavPassword
    delete updateData.cardDavReadPassword

    // MASTER CardDAV off ⇒ read wipe off (UI nests under MASTER enable)
    if (data.cardDavEnabled === false) {
      updateData.cardDavReadEnabled = false
    }

    if (data.cardDavPassword) {
      updateData.cardDavPasswordEnc = encrypt(data.cardDavPassword)
    } else if (data.cardDavPassword === null) {
      updateData.cardDavPasswordEnc = null
    }

    if (data.cardDavReadPassword) {
      updateData.cardDavReadPasswordEnc = encrypt(data.cardDavReadPassword)
    } else if (data.cardDavReadPassword === null) {
      updateData.cardDavReadPasswordEnc = null
    }

    const readEnabled =
      typeof updateData.cardDavReadEnabled === 'boolean'
        ? updateData.cardDavReadEnabled
        : data.cardDavReadEnabled
    if (readEnabled === true) {
      const nextUrl =
        data.cardDavReadUrl !== undefined ? data.cardDavReadUrl : existing.cardDavReadUrl
      const nextUser =
        data.cardDavReadUsername !== undefined
          ? data.cardDavReadUsername
          : existing.cardDavReadUsername
      const nextPassEnc =
        (updateData.cardDavReadPasswordEnc as string | null | undefined) !== undefined
          ? (updateData.cardDavReadPasswordEnc as string | null)
          : existing.cardDavReadPasswordEnc
      if (!nextUrl || !nextUser || !nextPassEnc) {
        return NextResponse.json(
          {
            error:
              'Read-account vereist URL, gebruikersnaam en wachtwoord wanneer opschonen is ingeschakeld',
          },
          { status: 400 },
        )
      }
      const masterBook =
        data.cardDavAddressBook !== undefined
          ? data.cardDavAddressBook
          : existing.cardDavAddressBook
      if (shouldSkipReadWipe(masterBook)) {
        return NextResponse.json(
          {
            error:
              'Read-account opschonen mag niet wanneer MASTER-adresboek "contacts" is',
          },
          { status: 400 },
        )
      }
    }

    const entity = await prisma.entity.update({
      where: { id },
      data: updateData,
    })

    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `Entity:${entity.id}`,
      meta: { name: entity.name, changes: Object.keys(data) },
    })

    const {
      cardDavPasswordEnc: _stripped,
      cardDavReadPasswordEnc: _strippedRead,
      ...safeEntity
    } = entity
    return NextResponse.json({
      ...safeEntity,
      cardDavPasswordSet: !!entity.cardDavPasswordEnc,
      cardDavReadPasswordSet: !!entity.cardDavReadPasswordEnc,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating entity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete entity (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAdmin()

    const entity = await prisma.entity.findUnique({
      where: { id: id },
      select: { id: true, name: true },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.entity.delete({
      where: { id: id },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `Entity:${id}`,
      meta: { name: entity.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting entity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

