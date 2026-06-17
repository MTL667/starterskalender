import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, can } from '@/lib/authz'
import { z } from 'zod'

const PreviewSchema = z.object({
  templateNl: z.string(),
  templateFr: z.string(),
  templateEn: z.string(),
  generalMailAddress: z.string().email(),
})

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, value)
  }
  return result
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const user = await requirePermission('mail:offboarding')
    const { entityId } = await params

    if (!can(user, 'mail:offboarding', { entityId })) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'No access to this entity' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = PreviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const variables = {
      voornaam: 'Jan',
      achternaam: 'De Vries',
      algemeen_mailadres: parsed.data.generalMailAddress,
    }

    return NextResponse.json({
      previewNl: renderTemplate(parsed.data.templateNl, variables),
      previewFr: renderTemplate(parsed.data.templateFr, variables),
      previewEn: renderTemplate(parsed.data.templateEn, variables),
      variablesUsed: variables,
    })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: error.message },
        { status: 403 }
      )
    }
    console.error('[ooo-templates] Preview error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to preview template' },
      { status: 500 }
    )
  }
}
