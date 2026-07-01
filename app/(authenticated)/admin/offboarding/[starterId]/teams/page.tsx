'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Check, AlertTriangle, Search, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface OwnedGroup {
  groupId: string
  groupName: string
  members?: { userId: string; displayName: string }[]
}

interface OwnerMapping {
  groupId: string
  groupName: string
  newOwnerId: string
  newOwnerName: string
}

export default function TeamsOwnershipTransferPage() {
  const { starterId } = useParams<{ starterId: string }>()
  const router = useRouter()
  const t = useTranslations('offboarding')

  const [groups, setGroups] = useState<OwnedGroup[]>([])
  const [entityId, setEntityId] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Map<string, { newOwnerId: string; newOwnerName: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Map<string, { userId: string; displayName: string; mail?: string }[]>>(new Map())
  const [searchQueries, setSearchQueries] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const fetchGroups = async () => {
      const res = await fetch(`/api/offboarding/${starterId}/teams-ownership`)
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
        setEntityId(data.entityId || null)
      }
      setLoading(false)
    }
    fetchGroups()
  }, [starterId])

  const handleSearch = useCallback(async (groupId: string, query: string) => {
    setSearchQueries((prev) => new Map(prev).set(groupId, query))
    if (query.length < 2) {
      setSearchResults((prev) => { const next = new Map(prev); next.delete(groupId); return next })
      return
    }

    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&entityId=${entityId}`)
    if (res.ok) {
      const data = await res.json()
      setSearchResults((prev) => new Map(prev).set(groupId, data.users || []))
    }
  }, [entityId])

  const handleSelectOwner = (groupId: string, groupName: string, userId: string, displayName: string) => {
    setMapping((prev) => new Map(prev).set(groupId, { newOwnerId: userId, newOwnerName: displayName }))
    setSearchResults((prev) => { const next = new Map(prev); next.delete(groupId); return next })
    setSearchQueries((prev) => { const next = new Map(prev); next.delete(groupId); return next })
  }

  const handleSave = async () => {
    if (mapping.size < groups.length) return

    setSaving(true)
    setSaveError(null)
    const mappingArray: OwnerMapping[] = groups.map((g) => ({
      groupId: g.groupId,
      groupName: g.groupName,
      newOwnerId: mapping.get(g.groupId)!.newOwnerId,
      newOwnerName: mapping.get(g.groupId)!.newOwnerName,
    }))

    const res = await fetch(`/api/offboarding/${starterId}/teams-ownership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping: mappingArray }),
    })

    if (res.ok) {
      router.back()
    } else {
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error || `Opslaan mislukt (${res.status})`)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{t('loadingTeams')}</span>
      </div>
    )
  }

  const allMapped = mapping.size === groups.length

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
        <h1 className="text-2xl font-bold">{t('teamsOwnershipTransfer')}</h1>
      </div>

      <p className="text-muted-foreground">
        {t('teamsOwnershipDescription', { count: groups.length })}
      </p>

      <div className="space-y-4">
        {groups.map((group) => {
          const selected = mapping.get(group.groupId)
          const query = searchQueries.get(group.groupId) || ''
          const results = searchResults.get(group.groupId) || []

          return (
            <Card key={group.groupId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group.groupName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{selected.newOwnerName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMapping((prev) => { const next = new Map(prev); next.delete(group.groupId); return next })}
                    >
                      {t('change')}
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder={t('searchNewOwner')}
                      value={query}
                      onChange={(e) => handleSearch(group.groupId, e.target.value)}
                    />
                    {results.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {results.map((user) => (
                          <button
                            key={user.userId}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => handleSelectOwner(group.groupId, group.groupName, user.userId, user.displayName)}
                          >
                            <span className="font-medium">{user.displayName}</span>
                            {user.mail && <span className="text-muted-foreground ml-2">{user.mail}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {groups.length > 0 && (
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={!allMapped || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('confirmMapping')}
          </Button>
          {!allMapped && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {t('selectAllOwners', { remaining: groups.length - mapping.size })}
            </span>
          )}
          {saveError && (
            <span className="text-sm text-destructive">{saveError}</span>
          )}
        </div>
      )}
    </div>
  )
}
