import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ starterId: string }> }
) {
  return NextResponse.json(
    { error: 'TAP generation is no longer supported. The initial password is set during provisioning.' },
    { status: 410 }
  )
}
