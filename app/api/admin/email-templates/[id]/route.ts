import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET: Haal een specifieke email template op
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching email template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    )
  }
}

const UpdateTemplateSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// PATCH: Update een email template
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const data = UpdateTemplateSchema.parse(body)

    const updated = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        ...data,
        updatedBy: user.id,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating email template:', error)
    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    )
  }
}

// DELETE: Verwijder een email template
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult

  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    await prisma.emailTemplate.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email template:', error)
    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    )
  }
}

