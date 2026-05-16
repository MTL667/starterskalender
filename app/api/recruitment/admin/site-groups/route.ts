import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/authz'
import { revalidatePath } from 'next/cache'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  entityIds: z.array(z.string()).min(1),
})

export async function GET() {
  try {
    await requirePermission('recruitment:admin')

    const groups = await prisma.siteGroup.findMany({
      include: {
        entities: { select: { id: true, name: true, colorHex: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: groups })
  } catch (error: any) {
    if (error?.message?.includes('Forbidden') || error?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: { message: error.message, code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission('recruitment:admin')

    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    const { name, slug, entityIds } = parsed.data

    const existingSlug = await prisma.siteGroup.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json(
        { error: { message: 'Slug already in use', code: 'DUPLICATE' } },
        { status: 409 }
      )
    }

    const existingEntities = await prisma.entity.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, name: true, siteGroupId: true },
    })

    if (existingEntities.length !== entityIds.length) {
      return NextResponse.json(
        { error: { message: 'One or more entity IDs are invalid', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const alreadyAssigned = existingEntities.filter((e) => e.siteGroupId !== null)

    if (alreadyAssigned.length > 0) {
      return NextResponse.json(
        { error: { message: `Entities already assigned to another group: ${alreadyAssigned.map((e) => e.name).join(', ')}`, code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    let group
    try {
      group = await prisma.siteGroup.create({
        data: { name, slug },
      })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: { message: 'Slug already in use', code: 'DUPLICATE' } },
          { status: 409 }
        )
      }
      throw err
    }

    await prisma.entity.updateMany({
      where: { id: { in: entityIds } },
      data: { siteGroupId: group.id },
    })

    const result = await prisma.siteGroup.findUnique({
      where: { id: group.id },
      include: { entities: { select: { id: true, name: true, colorHex: true } } },
    })

    revalidatePath(`/jobs/${slug}`)

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error: any) {
    if (error?.message?.includes('Forbidden') || error?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: { message: error.message, code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL' } },
      { status: 500 }
    )
  }
}
