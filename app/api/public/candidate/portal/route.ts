import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: { message: 'Token required' } }, { status: 400 })
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        { verificationToken: token },
        { consentRenewalToken: token },
      ],
      deletedAt: null,
    },
    select: {
      firstName: true,
      lastName: true,
      status: true,
      starterId: true,
      vacancy: {
        select: {
          title: true,
        },
      },
      stage: {
        select: { name: true },
      },
      starter: {
        select: {
          startDate: true,
          entity: { select: { name: true } },
          roleTitle: true,
        },
      },
    },
  })

  if (!candidate) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      status: candidate.status,
      starterId: candidate.starterId,
      startDate: candidate.starter?.startDate?.toISOString() ?? null,
      entityName: candidate.starter?.entity?.name ?? null,
      roleTitle: candidate.starter?.roleTitle ?? null,
      vacancyTitle: candidate.vacancy.title,
      stageName: candidate.stage.name,
    },
  })
}
