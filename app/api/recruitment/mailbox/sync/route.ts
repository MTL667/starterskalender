import { NextResponse } from 'next/server'
import { requirePermission, visibleEntityIds } from '@/lib/authz'
import { syncMailboxForUser } from '@/lib/recruitment/mailbox-sync'

export async function POST(request: Request) {
  try {
    const user = await requirePermission('recruitment:write')

    const body = await request.json()
    const { accessToken } = body as { accessToken?: string }

    if (!accessToken) {
      return NextResponse.json(
        { error: { message: 'accessToken is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    const entities = visibleEntityIds(user, 'recruitment:write')
    const entityIdList = entities === 'ALL' ? undefined : entities
    const result = await syncMailboxForUser(user.id, accessToken, entityIdList)
    return NextResponse.json({ data: result })
  } catch (err: any) {
    if (err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
      const status = err.message.includes('Unauthorized') ? 401 : 403
      return NextResponse.json(
        { error: { message: err.message, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' } },
        { status }
      )
    }
    console.error('Mailbox sync error:', err)
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
