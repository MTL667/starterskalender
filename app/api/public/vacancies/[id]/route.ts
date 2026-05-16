import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 100
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

export async function GET(
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

  const { id } = await params

  const vacancy = await prisma.vacancy.findFirst({
    where: {
      id,
      status: 'PUBLISHED',
      deletedAt: null,
      entity: { siteGroupId: { not: null } },
    },
    select: {
      id: true,
      title: true,
      location: true,
      type: true,
      description: true,
      content: true,
      dealbreakers: true,
      niceToHaves: true,
      createdAt: true,
      entity: {
        select: {
          name: true,
          colorHex: true,
          siteGroup: { select: { slug: true } },
        },
      },
    },
  })

  if (!vacancy) {
    return NextResponse.json(
      { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
      { status: 404 }
    )
  }

  const slug = vacancy.entity.siteGroup?.slug

  const data = {
    id: vacancy.id,
    title: vacancy.title,
    location: vacancy.location,
    type: vacancy.type,
    description: vacancy.description,
    content: Array.isArray(vacancy.content) ? vacancy.content : [],
    dealbreakers: Array.isArray(vacancy.dealbreakers) ? vacancy.dealbreakers : [],
    niceToHaves: Array.isArray(vacancy.niceToHaves) ? vacancy.niceToHaves : [],
    entity: {
      name: vacancy.entity.name,
      colorHex: vacancy.entity.colorHex,
      siteGroupSlug: slug,
    },
    publishedAt: vacancy.createdAt.toISOString(),
    applyUrl: slug ? `/jobs/${slug}/${vacancy.id}/apply` : null,
  }

  return NextResponse.json(
    { data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    }
  )
}
