import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { can, toAuthorizedUser } from '@/lib/authz'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const authUser = toAuthorizedUser(user)

    if (!can(authUser, 'admin:data:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 })
    }

    if (!file.name.endsWith('.sql')) {
      return NextResponse.json({ error: 'Alleen .sql bestanden toegestaan' }, { status: 400 })
    }

    const maxSize = 200 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Bestand te groot (max 200MB)' }, { status: 400 })
    }

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json({ error: 'DATABASE_URL niet geconfigureerd' }, { status: 500 })
    }

    const sqlContent = await file.text()

    if (/\b(DROP\s+(DATABASE|SCHEMA)|TRUNCATE)\b/i.test(sqlContent)) {
      return NextResponse.json(
        { error: 'SQL bevat onveilige statements (DROP DATABASE/SCHEMA, TRUNCATE)' },
        { status: 400 },
      )
    }

    const tmpFile = join('/tmp', `airport-import-${randomBytes(8).toString('hex')}.sql`)

    try {
      await writeFile(tmpFile, sqlContent, 'utf-8')

      const { stdout, stderr } = await execAsync(
        `psql "${dbUrl}" -f "${tmpFile}" --set ON_ERROR_STOP=off 2>&1`,
        { maxBuffer: 100 * 1024 * 1024 },
      )

      const output = stdout + (stderr || '')
      const errorLines = output
        .split('\n')
        .filter(l => l.includes('ERROR'))
      const insertLines = output
        .split('\n')
        .filter(l => l.includes('INSERT'))

      console.log(`[Data Import] Completed by ${user.email}: ${insertLines.length} inserts, ${errorLines.length} errors`)

      return NextResponse.json({
        ok: true,
        stats: {
          inserts: insertLines.length,
          errors: errorLines.length,
          errorDetails: errorLines.slice(0, 20),
        },
      })
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[Data Import] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Import mislukt' },
      { status: 500 },
    )
  }
}
