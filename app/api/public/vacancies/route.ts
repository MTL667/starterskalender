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

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
      { status: 429 }
    )
  }

  const slug = request.nextUrl.searchParams.get('siteGroup')
  if (!slug) {
    return NextResponse.json(
      { error: { message: 'siteGroup query parameter is required', code: 'MISSING_PARAM' } },
      { status: 400 }
    )
  }

  const siteGroup = await prisma.siteGroup.findUnique({
    where: { slug },
    select: { id: true, name: true },
  })

  if (!siteGroup) {
    return NextResponse.json(
      { error: { message: 'Site group not found', code: 'NOT_FOUND' } },
      { status: 404 }
    )
  }

  const entityCount = await prisma.entity.count({ where: { siteGroupId: siteGroup.id } })
  if (entityCount === 0) {
    return NextResponse.json(
      { error: { message: 'Site group not found', code: 'NOT_FOUND' } },
      { status: 404 }
    )
  }

  const pageParam = request.nextUrl.searchParams.get('page')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '20', 10) || 20))
  const skip = (page - 1) * limit

  const where = {
    status: 'PUBLISHED' as const,
    deletedAt: null,
    entity: { siteGroupId: siteGroup.id },
  }

  const [vacancies, total] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      select: {
        id: true,
        title: true,
        location: true,
        type: true,
        description: true,
        updatedAt: true,
        entity: {
          select: { name: true, colorHex: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.vacancy.count({ where }),
  ])

  const data = vacancies.map((v) => ({
    id: v.id,
    title: v.title,
    location: v.location,
    type: v.type,
    entity: { name: v.entity.name, colorHex: v.entity.colorHex },
    description: v.description,
    publishedAt: v.updatedAt.toISOString(),
    detailUrl: `/jobs/${slug}/${v.id}`,
  }))

  return NextResponse.json(
    { data, total, page, limit },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    }
  )
}
