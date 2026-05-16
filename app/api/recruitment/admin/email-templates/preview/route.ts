import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { recruitmentEmailPreviewSchema } from '@/lib/recruitment/schemas'
import {
  renderRecruitmentTemplate,
  getSampleVariables,
  getUnresolvedVariables,
} from '@/lib/recruitment/email-variables'

export async function POST(request: Request) {
  try {
    await requirePermission('recruitment:admin')

    const body = await request.json()
    const parsed = recruitmentEmailPreviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    const sampleVars = getSampleVariables()
    const renderedBody = renderRecruitmentTemplate(parsed.data.body, sampleVars)
    const renderedSubject = parsed.data.subject
      ? renderRecruitmentTemplate(parsed.data.subject, sampleVars)
      : undefined

    const bodyUnresolved = getUnresolvedVariables(renderedBody)
    const subjectUnresolved = renderedSubject ? getUnresolvedVariables(renderedSubject) : []
    const unresolvedVariables = [...new Set([...bodyUnresolved, ...subjectUnresolved])]

    return NextResponse.json({
      data: {
        renderedBody,
        renderedSubject,
        unresolvedVariables,
      },
    })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Email template preview error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
