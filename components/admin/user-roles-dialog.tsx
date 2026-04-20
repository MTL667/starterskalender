'use client'

/**
 * Dialog voor RBAC v2 rol-toekenningen per gebruiker.
 * - Lijst van toegewezen rollen met entity-scope
 * - Nieuwe rol toekennen met multi-select entity-scope en optionele einddatum
 * - Intrekken van toekenningen met anti-lockout check op server
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, ShieldCheck, Globe } from 'lucide-react'

interface RoleMini {
  id: string
  key: string
  name: string
  isSystem: boolean
  bypassEntityScope: boolean
  _count?: { permissions: number }
}

interface Assignment {
  id: string
  roleId: string
  entityIds: string[]
  grantedAt: string
  expiresAt: string | null
  role: RoleMini
}

interface Entity {
  id: string
  name: string
  colorHex?: string
}

interface UserRolesDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function UserRolesDialog({ open, onClose, userId, userName }: UserRolesDialogProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [allRoles, setAllRoles] = useState<RoleMini[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New assignment form
  const [selRoleId, setSelRoleId] = useState('')
  const [selEntityIds, setSelEntityIds] = useState<Set<string>>(new Set())
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (open) fetchData()
  }, [open, userId])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [asRes, rolesRes, entRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}/role-assignments`),
        fetch('/api/admin/roles'),
        fetch('/api/entities'),
      ])
      if (!asRes.ok || !rolesRes.ok || !entRes.ok) throw new Error('Data laden mislukt')
      const asData = await asRes.json()
      const rolesData = await rolesRes.json()
      const entData = await entRes.json()
      setAssignments(asData.assignments)
      setAllRoles(rolesData.roles)
      setEntities(entData)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setSelRoleId('')
    setSelEntityIds(new Set())
    setExpiresAt('')
  }

  async function handleAdd() {
    if (!selRoleId) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/role-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selRoleId,
          entityIds: [...selEntityIds],
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Toekennen mislukt')
      resetForm()
      await fetchData()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDelete(raId: string) {
    if (!confirm('Deze rol-toekenning intrekken?')) return
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/role-assignments?ra=${raId}`,
        { method: 'DELETE' },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verwijderen mislukt')
      await fetchData()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function toggleEntity(id: string) {
    setSelEntityIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedRole = allRoles.find((r) => r.id === selRoleId)
  const availableRoles = allRoles.filter(
    (r) => !assignments.some((a) => a.roleId === r.id),
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rollen & toegang — {userName}</DialogTitle>
          <DialogDescription>
            Ken rechtengroepen toe met een optionele entity-scope. Een toekenning zonder entiteiten
            geldt globaal (alle entiteiten). System-rollen met "bypass" overschrijven de scope altijd.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="px-3 py-2 rounded border bg-red-50 border-red-300 text-red-900 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Huidige toekenningen</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Laden…</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen rollen toegewezen.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => {
                  const entitiesOfRA = entities.filter((e) => a.entityIds.includes(e.id))
                  const isGlobal = a.role.bypassEntityScope || a.entityIds.length === 0
                  const expired = a.expiresAt && new Date(a.expiresAt) < new Date()
                  return (
                    <div
                      key={a.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium truncate">{a.role.name}</span>
                          {a.role.isSystem && (
                            <Badge variant="secondary" className="text-[10px]">system</Badge>
                          )}
                          {a.role.bypassEntityScope && (
                            <Badge className="text-[10px] bg-amber-200 text-amber-900 hover:bg-amber-200">
                              all-access
                            </Badge>
                          )}
                          {expired && (
                            <Badge variant="destructive" className="text-[10px]">verlopen</Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        {isGlobal ? (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Alle entiteiten
                          </span>
                        ) : (
                          <>
                            <span>Scope:</span>
                            {entitiesOfRA.map((e) => (
                              <Badge key={e.id} variant="outline" className="text-[10px]">
                                {e.name}
                              </Badge>
                            ))}
                          </>
                        )}
                        {a.expiresAt && (
                          <span>· verloopt {new Date(a.expiresAt).toLocaleDateString('nl-BE')}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {availableRoles.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Rol toekennen</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Rol</Label>
                  <Select value={selRoleId} onValueChange={setSelRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer een rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                          {r.bypassEntityScope && ' — all-access'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRole && !selectedRole.bypassEntityScope && (
                  <div>
                    <Label className="text-xs">Entity-scope</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Geen selectie = geldt voor alle entiteiten.
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                      {entities.map((e) => (
                        <label key={e.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={selEntityIds.has(e.id)}
                            onCheckedChange={() => toggleEntity(e.id)}
                          />
                          {e.colorHex && (
                            <span
                              className="w-3 h-3 rounded shrink-0"
                              style={{ backgroundColor: e.colorHex }}
                            />
                          )}
                          <span className="truncate">{e.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRole?.bypassEntityScope && (
                  <div className="px-3 py-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    Deze rol geldt automatisch voor álle entiteiten (bypass) — entity-scope wordt genegeerd.
                  </div>
                )}

                <div>
                  <Label className="text-xs" htmlFor="expires">
                    Einddatum (optioneel)
                  </Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleAdd} disabled={!selRoleId} className="gap-2">
                    <Plus className="h-4 w-4" /> Toekennen
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
