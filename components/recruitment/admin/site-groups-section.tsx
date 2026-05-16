'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

interface SiteGroup {
  id: string
  name: string
  slug: string
  entities: { id: string; name: string; colorHex: string }[]
}

interface EntityOption {
  id: string
  name: string
  colorHex: string
  siteGroupId: string | null
}

export function SiteGroupsSection() {
  const t = useTranslations('recruitment.settings')
  const [groups, setGroups] = useState<SiteGroup[]>([])
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SiteGroup | null>(null)
  const [creating, setCreating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [groupsRes, entitiesRes] = await Promise.all([
        fetch('/api/recruitment/admin/site-groups'),
        fetch('/api/admin/entities'),
      ])
      if (groupsRes.ok) {
        const g = await groupsRes.json()
        setGroups(g.data ?? [])
      }
      if (entitiesRes.ok) {
        const e = await entitiesRes.json()
        setEntities(Array.isArray(e.data) ? e.data : e.entities ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('siteGroupsTitle')}</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('loading')}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('siteGroupsTitle')}</h2>
        <Button size="sm" onClick={() => setCreating(true)} disabled={creating}>
          <Plus className="h-4 w-4 mr-1" />
          {t('addGroup')}
        </Button>
      </div>

      {creating && (
        <SiteGroupForm
          entities={entities}
          existingGroups={groups}
          onSave={() => { setCreating(false); fetchData() }}
          onCancel={() => setCreating(false)}
          t={t}
        />
      )}

      {editing && (
        <SiteGroupForm
          group={editing}
          entities={entities}
          existingGroups={groups}
          onSave={() => { setEditing(null); fetchData() }}
          onCancel={() => setEditing(null)}
          t={t}
        />
      )}

      {groups.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">{t('noGroups')}</p>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{group.name}</span>
                  <Badge variant="outline" className="text-xs font-mono">/jobs/{group.slug}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {group.entities.map((e) => (
                    <Badge key={e.id} style={{ backgroundColor: e.colorHex, color: '#fff' }} className="text-xs">
                      {e.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditing(group)} className="min-h-[44px] min-w-[44px]">
                  <Pencil className="h-4 w-4" />
                </Button>
                <DeleteButton groupId={group.id} groupName={group.name} onDeleted={fetchData} t={t} />
              </div>
            </div>
            <EmbedCode slug={group.slug} t={t} />
          </div>
        ))}
      </div>
    </section>
  )
}

function SiteGroupForm({
  group,
  entities,
  existingGroups,
  onSave,
  onCancel,
  t,
}: {
  group?: SiteGroup
  entities: EntityOption[]
  existingGroups: SiteGroup[]
  onSave: () => void
  onCancel: () => void
  t: any
}) {
  const [name, setName] = useState(group?.name ?? '')
  const [slug, setSlug] = useState(group?.slug ?? '')
  const [selectedIds, setSelectedIds] = useState<string[]>(group?.entities.map((e) => e.id) ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const assignedToOther = new Set(
    existingGroups
      .filter((g) => g.id !== group?.id)
      .flatMap((g) => g.entities.map((e) => e.id))
  )

  const availableEntities = entities.filter((e) => !assignedToOther.has(e.id))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const url = group
      ? `/api/recruitment/admin/site-groups/${group.id}`
      : '/api/recruitment/admin/site-groups'

    try {
      const res = await fetch(url, {
        method: group ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, entityIds: selectedIds }),
      })

      if (res.ok) {
        onSave()
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error?.message ?? 'Failed to save')
      }
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">{t('fieldName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">{t('fieldSlug')}</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
            required
            pattern="[a-z0-9-]+"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">{t('fieldEntities')}</label>
        <div className="flex flex-wrap gap-2">
          {availableEntities.map((entity) => (
            <label key={entity.id} className="flex items-center gap-1.5 text-sm min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(entity.id)}
                onChange={(e) => {
                  setSelectedIds((prev) =>
                    e.target.checked ? [...prev, entity.id] : prev.filter((id) => id !== entity.id)
                  )
                }}
                className="h-4 w-4"
              />
              <Badge style={{ backgroundColor: entity.colorHex, color: '#fff' }} className="text-xs">
                {entity.name}
              </Badge>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving || !name || !slug || selectedIds.length === 0}>
          {saving ? t('saving') : group ? t('save') : t('create')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}

function EmbedCode({ slug, t }: { slug: string; t: any }) {
  const [copied, setCopied] = useState(false)
  const embedUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/widget/${slug}`
  const code = `<script src="${embedUrl}"></script>`

  return (
    <div className="bg-muted/50 rounded p-2">
      <p className="text-xs font-medium text-muted-foreground mb-1">{t('embedCode')}</p>
      <div className="flex items-center gap-2">
        <code className="text-xs bg-background border rounded px-2 py-1 flex-1 truncate font-mono">
          {code}
        </code>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>
    </div>
  )
}

function DeleteButton({ groupId, groupName, onDeleted, t }: { groupId: string; groupName: string; onDeleted: () => void; t: any }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/recruitment/admin/site-groups/${groupId}`, { method: 'DELETE' })
      if (res.ok) onDeleted()
    } catch { /* ignore */ }
    setDeleting(false)
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="min-h-[44px]">
          {t('confirmDelete')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)} className="min-h-[44px]">
          {t('cancel')}
        </Button>
      </div>
    )
  }

  return (
    <Button variant="ghost" size="icon" onClick={() => setConfirming(true)} className="min-h-[44px] min-w-[44px] text-destructive">
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
