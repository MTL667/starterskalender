import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { ALL_SHAREABLE_FIELD_KEYS } from '@/lib/recruitment/field-mask'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requirePermission('recruitment:admin')

    const existing = await prisma.shareTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, visibleFields, isDefault } = body as {
      name?: string
      description?: string
      visibleFields?: string[]
      isDefault?: boolean
    }

    if (visibleFields) {
      if (!Array.isArray(visibleFields) || visibleFields.length === 0) {
        return NextResponse.json(
          { error: { message: 'At least one field is required', code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }
      const invalidFields = visibleFields.filter(
        (f) => !ALL_SHAREABLE_FIELD_KEYS.includes(f as any)
      )
      if (invalidFields.length > 0) {
        return NextResponse.json(
          { error: { message: `Invalid fields: ${invalidFields.join(', ')}`, code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }
    }

    if (isDefault) {
      await prisma.shareTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) {
      const trimmed = name.trim()
      if (trimmed.length < 1 || trimmed.length > 100) {
        return NextResponse.json(
          { error: { message: 'name must be between 1 and 100 characters', code: 'VALIDATION_ERROR' } },
          { status: 400 }
        )
      }
      updateData.name = trimmed
    }
    if (description !== undefined) updateData.description = description?.trim() || null
    if (visibleFields !== undefined) updateData.visibleFields = visibleFields
    if (isDefault !== undefined) updateData.isDefault = isDefault

    const updated = await prisma.shareTemplate.update({
      where: { id },
      data: Object.keys(updateData).length > 0 ? updateData : { updatedAt: new Date() },
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
    console.error('Share template update error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
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

    const existing = await prisma.shareTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Template not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (existing.usageCount > 0) {
      return NextResponse.json(
        { error: { message: 'Cannot delete template with active usage', code: 'IN_USE' } },
        { status: 409 }
      )
    }

    await prisma.shareTemplate.delete({ where: { id } })

    return NextResponse.json({ data: { id } })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Share template delete error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
