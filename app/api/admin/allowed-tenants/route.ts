import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const AllowedTenantSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is verplicht'),
  tenantName: z.string().min(1, 'Tenant naam is verplicht'),
  domain: z.string().optional(),
  notes: z.string().optional(),
})

// GET - List all allowed tenants
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const allowedTenants = await prisma.allowedTenant.findMany({
      orderBy: [
        { isActive: 'desc' },
        { tenantName: 'asc' },
      ],
    })

    return NextResponse.json(allowedTenants)
  } catch (error) {
    console.error('Error fetching allowed tenants:', error)
    return NextResponse.json(
      { error: 'Unauthorized or error fetching data' },
      { status: 401 }
    )
  }
}

// POST - Create new allowed tenant
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const body = await req.json()

    const validated = AllowedTenantSchema.parse(body)

    // Check if tenant already exists
    const existing = await prisma.allowedTenant.findUnique({
      where: { tenantId: validated.tenantId },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Deze tenant ID bestaat al in de allowlist' },
        { status: 400 }
      )
    }

    const allowedTenant = await prisma.allowedTenant.create({
      data: {
        ...validated,
        createdBy: user.id,
      },
    })

    // Log audit
    const { createAuditLog } = await import('@/lib/audit')
    await createAuditLog({
      actorId: user.id,
      action: 'CREATE',
      target: `AllowedTenant:${allowedTenant.id}`,
      meta: {
        tenantId: allowedTenant.tenantId,
        tenantName: allowedTenant.tenantName,
      },
    })

    return NextResponse.json(allowedTenant, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validatiefout', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating allowed tenant:', error)
    return NextResponse.json(
      { error: 'Fout bij aanmaken van allowed tenant' },
      { status: 500 }
    )
  }
}

