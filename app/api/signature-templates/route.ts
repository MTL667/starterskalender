import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { z } from 'zod'

const SignatureTemplateSchema = z.object({
  entityId: z.string(),
  name: z.string().min(1),
  htmlTemplate: z.string().min(1),
  isActive: z.boolean().default(true),
})

// GET - List all signature templates
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')

    const where = entityId ? { entityId } : {}

    const templates = await prisma.signatureTemplate.findMany({
      where,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching signature templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new signature template
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = SignatureTemplateSchema.parse(body)

    // Check if template already exists for this entity
    const existing = await prisma.signatureTemplate.findUnique({
      where: { entityId: data.entityId },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Template already exists for this entity. Use PATCH to update.' },
        { status: 409 }
      )
    }

    const template = await prisma.signatureTemplate.create({
      data: {
        ...data,
        createdBy: user.id,
      },
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

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating signature template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

