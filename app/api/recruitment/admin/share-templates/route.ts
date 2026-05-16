import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { ALL_SHAREABLE_FIELD_KEYS } from '@/lib/recruitment/field-mask'

export async function GET() {
  try {
    await requirePermission('recruitment:admin')

    const templates = await prisma.shareTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ data: templates })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Share templates list error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission('recruitment:admin')

    const body = await request.json()
    const { name, description, visibleFields, isDefault } = body as {
      name?: string
      description?: string
      visibleFields?: string[]
      isDefault?: boolean
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: { message: 'Name is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    if (!visibleFields || !Array.isArray(visibleFields) || visibleFields.length === 0) {
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

    if (isDefault) {
      await prisma.shareTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prisma.shareTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        visibleFields,
        isDefault: isDefault ?? false,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Share template creation error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
