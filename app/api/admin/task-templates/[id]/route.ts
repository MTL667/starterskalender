import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const template = await prisma.taskTemplate.findUnique({
      where: { id },
    })
    if (!template) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ template })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching task template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const ALLOWED_FIELDS: Array<keyof any> = [
  'type',
  'title',
  'description',
  'priority',
  'daysUntilDue',
  'isActive',
  'autoAssign',
  'forEntityIds',
  'forJobRoleTitles',
  'requireExplicitJobRole',
  'forStarterType',
  'dependsOnTemplateIds',
  'scheduleType',
  'addToCalendar',
  'uploadFolder',
  'expectedOutputs',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const data: any = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in body) data[key as string] = body[key as string]
    }

    if (Array.isArray(data.dependsOnTemplateIds)) {
      data.dependsOnTemplateIds = data.dependsOnTemplateIds.filter(
        (x: string) => x && x !== id
      )
    }

    const template = await prisma.taskTemplate.update({
      where: { id },
      data,
    })
    return NextResponse.json({ template })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating task template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const dependents = await prisma.taskTemplate.findMany({
      where: { dependsOnTemplateIds: { has: id } },
      select: { id: true, title: true },
    })
    if (dependents.length > 0) {
      return NextResponse.json(
        {
          error: 'Template heeft nog afhankelijke templates. Verwijder eerst de afhankelijkheden.',
          dependents,
        },
        { status: 409 }
      )
    }

    await prisma.taskTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Forbidden: Admin rights required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting task template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
