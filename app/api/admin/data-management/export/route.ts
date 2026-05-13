import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const TABLE_GROUPS: Record<string, string[]> = {
  configuration: [
    'Entity', 'JobRole', 'BlockedPeriod', 'Material', 'JobRoleMaterial',
    'TaskTemplate', 'TaskAssignment', 'EmailTemplate', 'SystemSettings',
    'AllowedTenant', 'Room', 'SignatureTemplate',
  ],
  rbac: [
    'Permission', 'Role', 'RolePermission',
  ],
  users: [
    'User', 'UserRoleAssignment', 'Membership', 'NotificationPreference',
  ],
  starters: [
    'Starter', 'StarterMaterial', 'Task', 'StarterTaskUpload',
    'TaskReassignment', 'StarterDocument', 'DocumentAuditEvent',
  ],
  bookings: [
    'Booking',
  ],
  notifications: [
    'Notification',
  ],
  logs: [
    'AuditLog', 'EmailLog',
  ],
}

function prismaToSqlTable(model: string): string {
  return `'"${model}"'`
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const authUser = toAuthorizedUser(user)

    if (!can(authUser, 'admin:data:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const selectedGroups: string[] = body.groups || Object.keys(TABLE_GROUPS)

    const invalidGroups = selectedGroups.filter(g => !TABLE_GROUPS[g])
    if (invalidGroups.length > 0) {
      return NextResponse.json(
        { error: `Onbekende groepen: ${invalidGroups.join(', ')}` },
        { status: 400 },
      )
    }

    const tables = selectedGroups.flatMap(g => TABLE_GROUPS[g])
    const tableArgs = tables.map(t => `-t ${prismaToSqlTable(t)}`).join(' ')

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json({ error: 'DATABASE_URL niet geconfigureerd' }, { status: 500 })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `airport-export-${timestamp}.sql`

    const { stdout, stderr } = await execAsync(
      `pg_dump "${dbUrl}" ${tableArgs} --data-only --inserts --on-conflict-do-nothing --no-owner --no-privileges`,
      { maxBuffer: 100 * 1024 * 1024 },
    )

    if (stderr && !stderr.includes('NOTICE')) {
      console.error('[Data Export] pg_dump stderr:', stderr)
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/sql')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    const meta = [
      '-- Airport Database Export',
      `-- Date: ${new Date().toISOString()}`,
      `-- Groups: ${selectedGroups.join(', ')}`,
      `-- Tables: ${tables.join(', ')}`,
      `-- Exported by: ${user.email}`,
      '',
    ].join('\n')

    return new NextResponse(meta + stdout, { headers })
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[Data Export] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Export mislukt' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    groups: Object.entries(TABLE_GROUPS).map(([key, tables]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      tables,
    })),
  })
}
