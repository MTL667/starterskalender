import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scoreCandidate } from '@/lib/recruitment/candidate-scoring'
import { sendApplicationConfirmationEmail } from '@/lib/recruitment/status-emails'

const TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vacancyId } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    const slug = await resolveVacancySlug(vacancyId)
    return redirectToApply(slug, vacancyId, 'invalid')
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      verificationToken: token,
      vacancyId,
      deletedAt: null,
    },
    select: {
      id: true,
      verifiedAt: true,
      createdAt: true,
      vacancy: {
        select: {
          id: true,
          entityId: true,
          entity: {
            select: { siteGroup: { select: { slug: true } } },
          },
        },
      },
    },
  })

  if (!candidate) {
    const alreadyVerified = await prisma.candidate.findFirst({
      where: { vacancyId, verifiedAt: { not: null }, verificationToken: null },
      select: { id: true, vacancy: { select: { entity: { select: { siteGroup: { select: { slug: true } } } } } } },
    })
    if (alreadyVerified) {
      const slug = alreadyVerified.vacancy.entity.siteGroup?.slug
      return redirectToDetail(slug, vacancyId, 'already_verified')
    }
    const fallbackSlug = await resolveVacancySlug(vacancyId)
    return redirectToApply(fallbackSlug, vacancyId, 'invalid')
  }

  if (candidate.verifiedAt) {
    const slug = candidate.vacancy.entity.siteGroup?.slug
    return redirectToDetail(slug, vacancyId, 'already_verified')
  }

  const tokenAge = Date.now() - candidate.createdAt.getTime()
  if (tokenAge > TOKEN_EXPIRY_MS) {
    const slug = candidate.vacancy.entity.siteGroup?.slug
    return redirectToApply(slug, vacancyId, 'expired')
  }

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      verifiedAt: new Date(),
      verificationToken: null,
      status: 'ACTIVE',
    },
  })

  try {
    await scoreCandidate(vacancyId, candidate.id)
  } catch (err) {
    console.error('[Verify] Scoring failed for candidate:', candidate.id, err)
  }

  sendApplicationConfirmationEmail(
    candidate.id,
    candidate.vacancy.id,
    candidate.vacancy.entityId
  ).catch(() => {})

  const slug = candidate.vacancy.entity.siteGroup?.slug
  return redirectToDetail(slug, vacancyId, 'verified')
}

async function resolveVacancySlug(vacancyId: string): Promise<string | null> {
  const vacancy = await prisma.vacancy.findFirst({
    where: { id: vacancyId },
    select: { entity: { select: { siteGroup: { select: { slug: true } } } } },
  })
  return vacancy?.entity.siteGroup?.slug ?? null
}

function redirectToApply(slug: string | null | undefined, vacancyId: string, status: string): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const entityGroup = slug ?? 'jobs'
  return NextResponse.redirect(`${baseUrl}/jobs/${entityGroup}/${vacancyId}/apply?status=${status}`, { status: 302 })
}

function redirectToDetail(slug: string | null | undefined, vacancyId: string, status: string): NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const entityGroup = slug ?? 'jobs'
  return NextResponse.redirect(`${baseUrl}/jobs/${entityGroup}/${vacancyId}?status=${status}`, { status: 302 })
}
