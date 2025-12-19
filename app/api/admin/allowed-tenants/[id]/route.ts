import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateAllowedTenantSchema = z.object({
  tenantName: z.string().min(1, 'Tenant naam is verplicht').optional(),
  domain: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

// PATCH - Update allowed tenant
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const validated = UpdateAllowedTenantSchema.parse(body)

    const allowedTenant = await prisma.allowedTenant.update({
      where: { id },
      data: validated,
    })

    // Log audit
    const { createAuditLog } = await import('@/lib/audit')
    await createAuditLog({
      actorId: user.id,
      action: 'UPDATE',
      target: `AllowedTenant:${allowedTenant.id}`,
      meta: {
        tenantId: allowedTenant.tenantId,
        changes: validated,
      },
    })

    return NextResponse.json(allowedTenant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validatiefout', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating allowed tenant:', error)
    return NextResponse.json(
      { error: 'Fout bij updaten van allowed tenant' },
      { status: 500 }
    )
  }
}

// DELETE - Remove allowed tenant
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    const { id } = await params

    const allowedTenant = await prisma.allowedTenant.findUnique({
      where: { id },
    })

    if (!allowedTenant) {
      return NextResponse.json(
        { error: 'Allowed tenant niet gevonden' },
        { status: 404 }
      )
    }

    await prisma.allowedTenant.delete({
      where: { id },
    })

    // Log audit
    const { createAuditLog } = await import('@/lib/audit')
    await createAuditLog({
      actorId: user.id,
      action: 'DELETE',
      target: `AllowedTenant:${allowedTenant.id}`,
      meta: {
        tenantId: allowedTenant.tenantId,
        tenantName: allowedTenant.tenantName,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting allowed tenant:', error)
    return NextResponse.json(
      { error: 'Fout bij verwijderen van allowed tenant' },
      { status: 500 }
    )
  }
}

