import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/authz'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requirePermission('recruitment:read')

    const vacancy = await prisma.vacancy.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
        entityId: true,
        entity: {
          select: { siteGroup: { select: { slug: true } } },
        },
      },
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: { message: 'Vacancy not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const slug = vacancy.entity.siteGroup?.slug ?? vacancy.entityId

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const vacancyUrl = `${appUrl}/jobs/${slug}/${vacancy.id}`

    const svg = await QRCode.toString(vacancyUrl, {
      type: 'svg',
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })

    return NextResponse.json({
      data: {
        url: vacancyUrl,
        svg,
      },
    })
  } catch (error: any) {
    if (error?.message?.includes('Forbidden') || error?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: { message: error.message, code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL' } },
      { status: 500 }
    )
  }
}
