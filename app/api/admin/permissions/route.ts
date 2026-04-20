/**
 * GET /api/admin/permissions → alle permissions uit de catalogus, gegroepeerd per categorie.
 * Vereist `admin:roles:manage`.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/authz'

export async function GET() {
  try {
    await requirePermission('admin:roles:manage')
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })
    // Groepeer per categorie voor de UI
    const byCategory: Record<string, typeof permissions> = {}
    for (const p of permissions) {
      if (!byCategory[p.category]) byCategory[p.category] = []
      byCategory[p.category].push(p)
    }
    return NextResponse.json({ permissions, byCategory })
  } catch (e: any) {
    const status = e.message?.startsWith('Forbidden') ? 403 : 401
    return NextResponse.json({ error: e.message }, { status })
  }
}
