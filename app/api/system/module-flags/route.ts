import { NextResponse } from 'next/server'
import { getModuleFlags } from '@/lib/feature-flags'

export async function GET() {
  const flags = await getModuleFlags()
  return NextResponse.json(flags)
}
