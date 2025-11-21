import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { z } from 'zod'

const UpdateSignatureTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  htmlTemplate: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

// GET - Get single signature template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.signatureTemplate.findUnique({
      where: { id: params.id },
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

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching signature template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update signature template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = UpdateSignatureTemplateSchema.parse(body)

    const template = await prisma.signatureTemplate.update({
      where: { id: params.id },
      data,
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

    return NextResponse.json(template)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating signature template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete signature template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.signatureTemplate.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting signature template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

