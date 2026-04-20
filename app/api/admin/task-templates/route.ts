import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireAdmin()

    const templates = await prisma.taskTemplate.findMany({
      orderBy: [{ forStarterType: 'asc' }, { type: 'asc' }, { title: 'asc' }],
    })

    return NextResponse.json({ templates })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching task templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const body = await req.json()

    const template = await prisma.taskTemplate.create({
      data: {
        type: body.type,
        title: body.title,
        description: body.description || null,
        priority: body.priority || 'MEDIUM',
        daysUntilDue: body.daysUntilDue ?? 7,
        isActive: body.isActive ?? true,
        autoAssign: body.autoAssign ?? true,
        forEntityIds: Array.isArray(body.forEntityIds) ? body.forEntityIds : [],
        forJobRoleTitles: Array.isArray(body.forJobRoleTitles) ? body.forJobRoleTitles : [],
        requireExplicitJobRole: body.requireExplicitJobRole ?? false,
        forStarterType: body.forStarterType || null,
        dependsOnTemplateIds: Array.isArray(body.dependsOnTemplateIds) ? body.dependsOnTemplateIds : [],
        scheduleType: body.scheduleType || 'OFFSET_FROM_START',
        addToCalendar: body.addToCalendar ?? false,
        uploadFolder: body.uploadFolder || null,
        expectedOutputs: body.expectedOutputs ?? null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ template })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error creating task template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
