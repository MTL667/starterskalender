import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { NotificationType } from '@prisma/client'

// GET: Haal alle email templates op
export async function GET() {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult
  
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { type: 'asc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    )
  }
}

const CreateTemplateSchema = z.object({
  type: z.enum([
    'WEEKLY_REMINDER',
    'MONTHLY_SUMMARY',
    'QUARTERLY_SUMMARY',
    'YEARLY_SUMMARY',
  ]),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// POST: Maak een nieuwe email template aan
export async function POST(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const body = await req.json()
    const data = CreateTemplateSchema.parse(body)

    // Check if template for this type already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { type: data.type as NotificationType },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Template for ${data.type} already exists. Use PATCH to update.` },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        type: data.type as NotificationType,
        subject: data.subject,
        body: data.body,
        description: data.description,
        isActive: data.isActive ?? true,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating email template:', error)
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    )
  }
}

