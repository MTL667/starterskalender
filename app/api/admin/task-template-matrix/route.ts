import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

/**
 * Matrix van task templates × job-role-titels.
 * Toont standaard enkel templates met requireExplicitJobRole = true
 * (zodat admin per functie kan "aanzetten"), maar via ?all=1 alles.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const onlyExplicit = searchParams.get('all') !== '1'

    const [templates, jobRoles] = await Promise.all([
      prisma.taskTemplate.findMany({
        where: onlyExplicit ? { requireExplicitJobRole: true } : {},
        orderBy: [{ type: 'asc' }, { title: 'asc' }],
      }),
      prisma.jobRole.findMany({
        where: { isActive: true },
        include: { entity: { select: { id: true, name: true } } },
        orderBy: [{ entity: { name: 'asc' } }, { order: 'asc' }, { title: 'asc' }],
      }),
    ])

    return NextResponse.json({ templates, jobRoles })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching template matrix:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Toggle een (templateId, jobRoleTitle) koppeling.
 * body: { templateId, jobRoleTitle, enabled }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { templateId, jobRoleTitle, enabled } = await req.json()

    if (!templateId || !jobRoleTitle) {
      return NextResponse.json({ error: 'templateId en jobRoleTitle zijn vereist' }, { status: 400 })
    }

    const template = await prisma.taskTemplate.findUnique({ where: { id: templateId } })
    if (!template) {
      return NextResponse.json({ error: 'Template niet gevonden' }, { status: 404 })
    }

    const current = new Set(template.forJobRoleTitles || [])
    if (enabled) current.add(jobRoleTitle)
    else current.delete(jobRoleTitle)

    const updated = await prisma.taskTemplate.update({
      where: { id: templateId },
      data: { forJobRoleTitles: Array.from(current) },
    })

    return NextResponse.json({ template: updated })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error toggling template matrix:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
