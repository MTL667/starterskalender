import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAuthorizedUser } from '@/lib/authz'
import { graphApiService } from '@/lib/graph-api-service'

export async function GET(req: NextRequest) {
  const user = await getCurrentAuthorizedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] })
  }

  const entityId = req.nextUrl.searchParams.get('entityId')
  if (!entityId) {
    return NextResponse.json({ error: 'entityId required' }, { status: 400 })
  }

  try {
    const { token } = await graphApiService.getAuthenticatedClient(entityId)
    const escaped = q.replace(/'/g, "''")
    const filter = `startsWith(displayName,'${escaped}') or startsWith(mail,'${escaped}')`
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}&$select=id,displayName,mail&$top=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      return NextResponse.json({ users: [] })
    }

    const data = await res.json()
    const users = (data.value || []).map((u: any) => ({
      userId: u.id,
      displayName: u.displayName,
      mail: u.mail,
    }))

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ users: [] })
  }
}
