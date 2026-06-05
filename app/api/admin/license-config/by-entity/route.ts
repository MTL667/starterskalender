import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get('entityId')
  const roleTitle = req.nextUrl.searchParams.get('roleTitle')

  if (!entityId || !roleTitle) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const jobRole = await prisma.jobRole.findFirst({
    where: { entityId, title: roleTitle },
    include: { licenseConfig: true },
  })

  if (!jobRole?.licenseConfig) {
    return NextResponse.json({ requiredLicenseType: null })
  }

  return NextResponse.json({
    requiredLicenseType: jobRole.licenseConfig.requiredLicenseType,
  })
}
