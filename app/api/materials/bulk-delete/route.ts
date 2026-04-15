import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { isMaterialManager } from '@/lib/rbac'

const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMaterialManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { ids } = BulkDeleteSchema.parse(body)

    const result = await prisma.starterMaterial.deleteMany({
      where: { id: { in: ids } },
    })

    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `StarterMaterial:bulk`,
      meta: {
        action: 'bulk_delete',
        count: result.count,
        ids,
      },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error bulk deleting materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
