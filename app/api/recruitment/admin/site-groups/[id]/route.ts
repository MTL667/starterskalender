import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/authz'
import { revalidatePath } from 'next/cache'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  entityIds: z.array(z.string()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requirePermission('recruitment:admin')

    const group = await prisma.siteGroup.findUnique({
      where: { id },
      include: { entities: { select: { id: true } } },
    })

    if (!group) {
      return NextResponse.json(
        { error: { message: 'Site group not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    const { name, slug, entityIds } = parsed.data

    if (slug && slug !== group.slug) {
      const existingSlug = await prisma.siteGroup.findUnique({ where: { slug } })
      if (existingSlug) {
        return NextResponse.json(
          { error: { message: 'Slug already in use', code: 'DUPLICATE' } },
          { status: 409 }
        )
      }
    }

    if (entityIds) {
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

      const alreadyAssigned = existingEntities.filter(
        (e) => e.siteGroupId !== null && e.siteGroupId !== id
      )

      if (alreadyAssigned.length > 0) {
        return NextResponse.json(
          { error: { message: `Entities already assigned: ${alreadyAssigned.map((e) => e.name).join(', ')}`, code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }

      await prisma.entity.updateMany({
        where: { siteGroupId: id },
        data: { siteGroupId: null },
      })

      if (entityIds.length > 0) {
        await prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { siteGroupId: id },
        })
      }
    }

    const updateData: Record<string, string> = {}
    if (name) updateData.name = name
    if (slug) updateData.slug = slug

    let updated
    try {
      updated = await prisma.siteGroup.update({
        where: { id },
        data: Object.keys(updateData).length > 0 ? updateData : { updatedAt: new Date() },
        include: { entities: { select: { id: true, name: true, colorHex: true } } },
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

    revalidatePath(`/jobs/${group.slug}`)
    if (slug && slug !== group.slug) {
      revalidatePath(`/jobs/${slug}`)
    }

    return NextResponse.json({ data: updated })
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requirePermission('recruitment:admin')

    const group = await prisma.siteGroup.findUnique({ where: { id } })

    if (!group) {
      return NextResponse.json(
        { error: { message: 'Site group not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    await prisma.entity.updateMany({
      where: { siteGroupId: id },
      data: { siteGroupId: null },
    })

    await prisma.siteGroup.delete({ where: { id } })

    revalidatePath(`/jobs/${group.slug}`)

    return NextResponse.json({ data: { success: true } })
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
