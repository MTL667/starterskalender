import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/authz'
import { getModuleFlags, setModuleEnabled, MODULE_REGISTRY, ModuleKey } from '@/lib/feature-flags'

export async function GET() {
  try {
    await requirePermission('admin:users:manage')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const flags = await getModuleFlags()
  const modules = (Object.keys(MODULE_REGISTRY) as ModuleKey[]).map(key => ({
    key,
    label: MODULE_REGISTRY[key].label,
    description: MODULE_REGISTRY[key].description,
    enabled: flags[key],
  }))

  return NextResponse.json({ modules })
}

export async function PATCH(req: NextRequest) {
  try {
    await requirePermission('admin:users:manage')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { key, enabled } = body

  if (!key || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!(key in MODULE_REGISTRY)) {
    return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
  }

  await setModuleEnabled(key as ModuleKey, enabled)

  return NextResponse.json({ success: true })
}
