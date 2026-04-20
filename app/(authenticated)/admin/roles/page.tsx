'use client'

/**
 * Admin UI voor rollenbeheer (RBAC v2).
 * - Lijst van alle rollen (system + custom)
 * - Detail-panel met permission-matrix per categorie
 * - Create/edit/delete custom rollen
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Plus, Save, ShieldCheck, Trash2, Users as UsersIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface Role {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  bypassEntityScope: boolean
  _count?: { permissions: number; assignments: number }
  permissions?: Array<{ permission: { key: string; category: string; description: string | null; isFieldLevel: boolean } }>
}

interface Permission {
  key: string
  description: string | null
  category: string
  isFieldLevel: boolean
}

const CATEGORY_LABEL: Record<string, string> = {
  starters: 'Starters',
  tasks: 'Taken',
  materials: 'Materiaal',
  admin: 'Administratie',
  reporting: 'Rapportage',
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [permsByCategory, setPermsByCategory] = useState<Record<string, Permission[]>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formBypass, setFormBypass] = useState(false)
  const [formPerms, setFormPerms] = useState<Set<string>>(new Set())

  // New-role mode
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')

  async function loadAll() {
    setLoading(true)
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/admin/roles'),
        fetch('/api/admin/permissions'),
      ])
      if (!rolesRes.ok || !permsRes.ok) throw new Error('Laden mislukt')
      const rolesData = await rolesRes.json()
      const permsData = await permsRes.json()
      setRoles(rolesData.roles)
      setPermsByCategory(permsData.byCategory)
      if (!selectedId && rolesData.roles.length > 0) {
        setSelectedId(rolesData.roles[0].id)
      }
    } catch (e: any) {
      showFlash('error', e.message)
    } finally {
      setLoading(false)
    }
  }

  function showFlash(type: 'success' | 'error', msg: string) {
    setFlash({ type, msg })
    setTimeout(() => setFlash(null), 4000)
  }

  async function loadDetail(id: string) {
    try {
      const res = await fetch(`/api/admin/roles/${id}`)
      if (!res.ok) throw new Error('Kan rol niet laden')
      const { role } = await res.json()
      setDetail(role)
      setFormName(role.name)
      setFormDesc(role.description ?? '')
      setFormBypass(role.bypassEntityScope)
      setFormPerms(new Set((role.permissions ?? []).map((rp: any) => rp.permission.key)))
      setCreating(false)
    } catch (e: any) {
      showFlash('error', e.message)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId])

  const togglePerm = (key: string) => {
    setFormPerms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleCategory = (category: string) => {
    const inCategory = (permsByCategory[category] ?? []).map((p) => p.key)
    const allSelected = inCategory.every((k) => formPerms.has(k))
    setFormPerms((prev) => {
      const next = new Set(prev)
      if (allSelected) inCategory.forEach((k) => next.delete(k))
      else inCategory.forEach((k) => next.add(k))
      return next
    })
  }

  async function handleSave() {
    if (!detail && !creating) return
    setSaving(true)
    try {
      const body = {
        name: formName,
        description: formDesc || null,
        bypassEntityScope: formBypass,
        permissionKeys: [...formPerms],
      }
      if (creating) {
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, key: newKey }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Aanmaken mislukt')
        showFlash('success', 'Rol aangemaakt')
        await loadAll()
        setSelectedId(data.role.id)
        setCreating(false)
      } else if (detail) {
        const res = await fetch(`/api/admin/roles/${detail.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Opslaan mislukt')
        showFlash('success', 'Rol bijgewerkt')
        await loadAll()
        await loadDetail(detail.id)
      }
    } catch (e: any) {
      showFlash('error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!detail || detail.isSystem) return
    if (!confirm(`Rol "${detail.name}" definitief verwijderen?`)) return
    try {
      const res = await fetch(`/api/admin/roles/${detail.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verwijderen mislukt')
      showFlash('success', 'Rol verwijderd')
      setSelectedId(null)
      setDetail(null)
      await loadAll()
    } catch (e: any) {
      showFlash('error', e.message)
    }
  }

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setDetail(null)
    setNewKey('')
    setFormName('')
    setFormDesc('')
    setFormBypass(false)
    setFormPerms(new Set())
  }

  return (
    <div className="container mx-auto py-8">
      {flash && (
        <div
          className={`mb-4 px-4 py-3 rounded border text-sm ${
            flash.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {flash.msg}
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline mb-2">
            <ArrowLeft className="h-4 w-4" />
            Terug naar admin
          </Link>
          <h1 className="text-3xl font-bold">Rollen & permissies</h1>
          <p className="text-muted-foreground mt-1">
            Beheer rechtengroepen en de permissies die ze verlenen. System-rollen kunnen bewerkt maar niet verwijderd
            worden.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nieuwe rol
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Rollen</CardTitle>
            <CardDescription>{roles.length} totaal</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            {loading && <p className="p-4 text-sm text-muted-foreground">Laden…</p>}
            <ul className="space-y-1">
              {roles.map((role) => (
                <li key={role.id}>
                  <button
                    className={`w-full text-left rounded-md p-3 transition-colors ${
                      selectedId === role.id
                        ? 'bg-primary/10 border border-primary/40'
                        : 'hover:bg-muted border border-transparent'
                    }`}
                    onClick={() => setSelectedId(role.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {role.isSystem ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-medium truncate">{role.name}</span>
                      </div>
                      {role.bypassEntityScope && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                          Globaal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 ml-5">
                      <span>{role._count?.permissions ?? 0} perms</span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" />
                        {role._count?.assignments ?? 0}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div>
          {(detail || creating) && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 mr-4">
                    {creating && (
                      <>
                        <Label htmlFor="key" className="text-xs">
                          Key (klein, geen spaties, bv. "marketing-operator")
                        </Label>
                        <Input
                          id="key"
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="bv. marketing-operator"
                        />
                      </>
                    )}
                    <Label htmlFor="name" className="text-xs mt-2">
                      Naam
                    </Label>
                    <Input
                      id="name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Naam van de rol"
                    />
                    <Label htmlFor="desc" className="text-xs mt-2">
                      Beschrijving
                    </Label>
                    <Input
                      id="desc"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Wat kan iemand met deze rol?"
                    />
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? 'Bezig…' : 'Opslaan'}
                    </Button>
                    {detail && !detail.isSystem && (
                      <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Verwijderen
                      </Button>
                    )}
                  </div>
                </div>
                {detail?.isSystem && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                    <Lock className="h-3 w-3" />
                    System-rol — key en verwijdering vergrendeld, permissies kunnen aangepast worden
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Checkbox
                    id="bypass"
                    checked={formBypass}
                    onCheckedChange={(v) => setFormBypass(v === true)}
                  />
                  <Label htmlFor="bypass" className="text-sm">
                    Bypass entity-scope
                    <span className="block text-xs text-muted-foreground">
                      Toekenning met deze rol geldt automatisch voor álle entiteiten (HR-admin stijl)
                    </span>
                  </Label>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.keys(permsByCategory).sort().map((cat) => {
                  const perms = permsByCategory[cat]
                  const selectedInCat = perms.filter((p) => formPerms.has(p.key)).length
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{CATEGORY_LABEL[cat] ?? cat}</h3>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            {selectedInCat} / {perms.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className="text-primary hover:underline"
                          >
                            {selectedInCat === perms.length ? 'Alles wissen' : 'Alles selecteren'}
                          </button>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {perms.map((p) => (
                          <label
                            key={p.key}
                            className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              formPerms.has(p.key) ? 'bg-primary/5 border-primary/30' : 'border-transparent hover:bg-muted'
                            }`}
                          >
                            <Checkbox
                              checked={formPerms.has(p.key)}
                              onCheckedChange={() => togglePerm(p.key)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-xs font-mono bg-muted px-1 rounded">{p.key}</code>
                                {p.isFieldLevel && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">
                                    veld
                                  </span>
                                )}
                              </div>
                              {p.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
          {!detail && !creating && !loading && (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Selecteer een rol links of klik op <em>Nieuwe rol</em> om te beginnen.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
