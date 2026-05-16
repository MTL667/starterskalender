import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { uploadCandidateCV } from '@/lib/recruitment/sharepoint-documents'

const RATE_LIMIT_WINDOW_MS = 3_600_000
const RATE_LIMIT_MAX = 5
const ipHits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

const MAX_FILE_SIZE = 10_485_760
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const applyBodySchema = z.object({
  email: z.string().email().max(254).transform((v) => v.toLowerCase().trim()),
  motivation: z.string().max(2000).optional().default(''),
  _hp: z.string().optional().default(''),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
      { status: 429 }
    )
  }

  const { id: vacancyId } = await params

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid form data', code: 'INVALID_REQUEST' } },
      { status: 400 }
    )
  }

  const rawBody = {
    email: formData.get('email') as string | null,
    motivation: formData.get('motivation') as string | null,
    _hp: formData.get('_hp') as string | null,
  }

  let responses: unknown[] = []
  const responsesRaw = formData.get('responses') as string | null
  if (responsesRaw) {
    try {
      const parsed_resp = JSON.parse(responsesRaw)
      if (Array.isArray(parsed_resp)) responses = parsed_resp
    } catch { /* ignore malformed responses */ }
  }

  const parsed = applyBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    )
  }

  const { email, motivation, _hp } = parsed.data

  if (_hp) {
    return NextResponse.json({ data: { message: 'Application submitted' } }, { status: 201 })
  }

  const cvFile = formData.get('cv') as File | null
  if (!cvFile || !(cvFile instanceof File) || cvFile.size === 0) {
    return NextResponse.json(
      { error: { message: 'CV file is required', code: 'VALIDATION_ERROR', details: { cv: ['Required'] } } },
      { status: 400 }
    )
  }

  if (cvFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: { message: 'File too large (max 10MB)', code: 'VALIDATION_ERROR', details: { cv: ['File too large'] } } },
      { status: 400 }
    )
  }

  if (!ALLOWED_MIME_TYPES.includes(cvFile.type)) {
    return NextResponse.json(
      { error: { message: 'Only PDF or DOCX files accepted', code: 'VALIDATION_ERROR', details: { cv: ['Invalid file type'] } } },
      { status: 400 }
    )
  }

  const vacancy = await prisma.vacancy.findFirst({
    where: {
      id: vacancyId,
      status: 'PUBLISHED',
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      entity: {
        select: {
          id: true,
          name: true,
          colorHex: true,
          siteGroup: { select: { slug: true } },
        },
      },
      stages: {
        orderBy: { order: 'asc' },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!vacancy || vacancy.stages.length === 0) {
    return NextResponse.json(
      { error: { message: 'Vacancy not found or not accepting applications', code: 'NOT_FOUND' } },
      { status: 404 }
    )
  }

  const existingCandidate = await prisma.candidate.findUnique({
    where: { vacancyId_email: { vacancyId, email } },
    select: { id: true },
  })

  if (existingCandidate) {
    return NextResponse.json(
      { error: { message: 'Already applied for this vacancy', code: 'DUPLICATE' } },
      { status: 409 }
    )
  }

  const verificationToken = crypto.randomUUID()
  const firstStageId = vacancy.stages[0].id

  let candidate

  try {
    const result = await prisma.$transaction(async (tx) => {
      const c = await tx.candidate.create({
        data: {
          vacancyId,
          stageId: firstStageId,
          firstName: '',
          lastName: '',
          email,
          source: 'APPLICATION',
          status: 'PENDING_VERIFICATION',
          createdById: null,
          verificationToken,
          dealbreakersResult: 'PENDING',
        },
      })

      let cvDriveId: string | null = null
      let cvItemId: string | null = null
      const cvFileName = cvFile.name

      try {
        const buffer = Buffer.from(await cvFile.arrayBuffer())
        const uploadResult = await uploadCandidateCV(
          vacancy.entity.name,
          vacancy.title,
          email,
          cvFileName,
          buffer
        )
        cvDriveId = uploadResult.driveId
        cvItemId = uploadResult.itemId
      } catch (err) {
        console.error('[Apply] SharePoint CV upload failed:', err)
      }

      const app = await tx.candidateApplication.create({
        data: {
          candidateId: c.id,
          cvDriveId,
          cvItemId,
          cvFileName,
          motivation: motivation || null,
          responses: responses.length > 0 ? (responses as any) : [],
        },
      })

      return { candidate: c, application: app }
    })

    candidate = result.candidate
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: { message: 'Already applied for this vacancy', code: 'DUPLICATE' } },
        { status: 409 }
      )
    }
    throw err
  }

  const slug = vacancy.entity.siteGroup?.slug
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/public/vacancies/${vacancyId}/apply/verify?token=${verificationToken}`

  try {
    await sendEmail({
      to: email,
      subject: `Bevestig je sollicitatie bij ${vacancy.entity.name}`,
      html: buildVerificationEmail({
        vacancyTitle: vacancy.title,
        entityName: vacancy.entity.name,
        entityColor: vacancy.entity.colorHex,
        verifyUrl,
      }),
    })
  } catch (err) {
    console.error('[Apply] Verification email send failed:', err)
  }

  return NextResponse.json(
    { data: { message: 'Application submitted' } },
    { status: 201 }
  )
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildVerificationEmail(vars: {
  vacancyTitle: string
  entityName: string
  entityColor: string
  verifyUrl: string
}): string {
  const entityName = escapeHtml(vars.entityName)
  const vacancyTitle = escapeHtml(vars.vacancyTitle)
  const entityColor = /^#[0-9a-fA-F]{6}$/.test(vars.entityColor) ? vars.entityColor : '#2563eb'
  const verifyUrl = encodeURI(vars.verifyUrl)

  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
      <div style="background:${entityColor};padding:24px 32px;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">${entityName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 12px;color:#1f2937;font-size:18px;">Bevestig je sollicitatie</h2>
        <p style="color:#4b5563;line-height:1.6;margin:0 0 8px;">
          Bedankt voor je sollicitatie voor <strong>${vacancyTitle}</strong>.
        </p>
        <p style="color:#4b5563;line-height:1.6;margin:0 0 24px;">
          Klik op de knop hieronder om je e-mailadres te bevestigen en je sollicitatie af te ronden.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:${entityColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
          Bevestig mijn e-mail
        </a>
        <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;line-height:1.5;">
          Deze link vervalt na 48 uur. Heb je niet gesolliciteerd? Dan kun je deze e-mail negeren.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`.trim()
}
