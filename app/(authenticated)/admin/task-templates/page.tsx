'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, AlertCircle, Lock, Calendar, Upload, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

type TaskTemplate = {
  id: string
  type: string
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  daysUntilDue: number
  isActive: boolean
  autoAssign: boolean
  forEntityIds: string[]
  forJobRoleTitles: string[]
  requireExplicitJobRole: boolean
  forStarterType: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION' | null
  dependsOnTemplateIds: string[]
  scheduleType: 'OFFSET_FROM_START' | 'ON_START_DATE' | 'AFTER_DEPENDENCIES'
  addToCalendar: boolean
  uploadFolder: string | null
  expectedOutputs: any
}

const TASK_TYPES = [
  'IT_SETUP',
  'HR_ADMIN',
  'FACILITIES',
  'MANAGER_ACTION',
  'CUSTOM',
  'MARKETING_PHOTO',
  'MARKETING_EDIT',
  'MARKETING_UTM',
  'MARKETING_VCARD',
  'MARKETING_VISITEKAARTJE',
  'MARKETING_BADGE',
  'MARKETING_NFC',
  'MARKETING_SIGNATURE',
] as const

const STARTER_TYPES = ['ONBOARDING', 'OFFBOARDING', 'MIGRATION'] as const
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const SCHEDULE_TYPES = [
  { value: 'OFFSET_FROM_START', label: 'Offset vanaf startdatum (standaard)' },
  { value: 'ON_START_DATE', label: 'Op startdatum zelf (calendar event)' },
  { value: 'AFTER_DEPENDENCIES', label: 'Na afronding dependencies' },
] as const

type FormState = {
  type: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  daysUntilDue: number
  isActive: boolean
  autoAssign: boolean
  forEntityIds: string[]
  forJobRoleTitles: string[]
  requireExplicitJobRole: boolean
  forStarterType: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION' | null
  dependsOnTemplateIds: string[]
  scheduleType: 'OFFSET_FROM_START' | 'ON_START_DATE' | 'AFTER_DEPENDENCIES'
  addToCalendar: boolean
  uploadFolder: string
  expectedOutputs: string
}

const emptyForm: FormState = {
  type: 'CUSTOM',
  title: '',
  description: '',
  priority: 'MEDIUM',
  daysUntilDue: 7,
  isActive: true,
  autoAssign: true,
  forEntityIds: [],
  forJobRoleTitles: [],
  requireExplicitJobRole: false,
  forStarterType: 'ONBOARDING',
  dependsOnTemplateIds: [],
  scheduleType: 'OFFSET_FROM_START',
  addToCalendar: false,
  uploadFolder: '',
  expectedOutputs: '',
}

export default function TaskTemplatesAdminPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [entities, setEntities] = useState<Array<{ id: string; name: string }>>([])
  const [jobRoles, setJobRoles] = useState<Array<{ id: string; title: string; entity: { name: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TaskTemplate | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'MARKETING' | 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'>('ALL')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [tplRes, entRes, rolesRes] = await Promise.all([
        fetch('/api/admin/task-templates'),
        fetch('/api/entities'),
        fetch('/api/job-roles'),
      ])
      const tpl = await tplRes.json()
      const ent = await entRes.json()
      const roles = await rolesRes.json()
      setTemplates(tpl.templates || [])
      setEntities(Array.isArray(ent) ? ent : ent.entities || [])
      setJobRoles(Array.isArray(roles) ? roles : roles.jobRoles || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return templates
    if (filter === 'MARKETING') return templates.filter(t => t.type.startsWith('MARKETING_'))
    return templates.filter(t => t.forStarterType === filter)
  }, [templates, filter])

  const uniqueRoleTitles = useMemo(() => {
    const set = new Set<string>()
    jobRoles.forEach(r => set.add(r.title))
    return Array.from(set).sort()
  }, [jobRoles])

  const resetForm = () => {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (tpl: TaskTemplate) => {
    setEditing(tpl)
    setForm({
      type: tpl.type,
      title: tpl.title,
      description: tpl.description || '',
      priority: tpl.priority,
      daysUntilDue: tpl.daysUntilDue,
      isActive: tpl.isActive,
      autoAssign: tpl.autoAssign,
      forEntityIds: tpl.forEntityIds || [],
      forJobRoleTitles: tpl.forJobRoleTitles || [],
      requireExplicitJobRole: tpl.requireExplicitJobRole,
      forStarterType: tpl.forStarterType,
      dependsOnTemplateIds: tpl.dependsOnTemplateIds || [],
      scheduleType: tpl.scheduleType,
      addToCalendar: tpl.addToCalendar,
      uploadFolder: tpl.uploadFolder || '',
      expectedOutputs: Array.isArray(tpl.expectedOutputs)
        ? (tpl.expectedOutputs as string[]).join(',')
        : tpl.expectedOutputs
          ? String(tpl.expectedOutputs)
          : '',
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const expectedOutputs = form.expectedOutputs.trim()
        ? form.expectedOutputs.split(',').map(s => s.trim()).filter(Boolean)
        : null

      const payload = {
        ...form,
        description: form.description || null,
        uploadFolder: form.uploadFolder || null,
        expectedOutputs,
      }

      const url = editing
        ? `/api/admin/task-templates/${editing.id}`
        : '/api/admin/task-templates'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Opslaan mislukt')
      }
      await loadAll()
      setDialogOpen(false)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tpl: TaskTemplate) => {
    if (!confirm(`Template "${tpl.title}" verwijderen?`)) return
    const res = await fetch(`/api/admin/task-templates/${tpl.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Verwijderen mislukt')
      return
    }
    await loadAll()
  }

  const toggleJobRole = (title: string) => {
    setForm(f => ({
      ...f,
      forJobRoleTitles: f.forJobRoleTitles.includes(title)
        ? f.forJobRoleTitles.filter(t => t !== title)
        : [...f.forJobRoleTitles, title],
    }))
  }

  const toggleEntity = (id: string) => {
    setForm(f => ({
      ...f,
      forEntityIds: f.forEntityIds.includes(id)
        ? f.forEntityIds.filter(e => e !== id)
        : [...f.forEntityIds, id],
    }))
  }

  const toggleDependency = (id: string) => {
    setForm(f => ({
      ...f,
      dependsOnTemplateIds: f.dependsOnTemplateIds.includes(id)
        ? f.dependsOnTemplateIds.filter(d => d !== id)
        : [...f.dependsOnTemplateIds, id],
    }))
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Task Templates</h1>
            <p className="text-muted-foreground">
              Beheer automatische taken, dependencies, scheduling en uploads per template.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe template
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'MARKETING', 'ONBOARDING', 'OFFBOARDING', 'MIGRATION'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laden…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(tpl => {
            const depCount = (tpl.dependsOnTemplateIds || []).length
            const roleCount = (tpl.forJobRoleTitles || []).length
            const entCount = (tpl.forEntityIds || []).length
            const hasUploads = tpl.uploadFolder || (Array.isArray(tpl.expectedOutputs) && (tpl.expectedOutputs as string[]).length > 0)
            return (
              <Card key={tpl.id} className={tpl.isActive ? '' : 'opacity-60'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{tpl.title}</CardTitle>
                      <CardDescription className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="font-mono text-[10px]">{tpl.type}</Badge>
                        {tpl.forStarterType && (
                          <Badge variant="secondary" className="text-[10px]">{tpl.forStarterType}</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">Prioriteit: {tpl.priority}</Badge>
                        {!tpl.isActive && <Badge variant="destructive" className="text-[10px]">Inactief</Badge>}
                        {!tpl.autoAssign && <Badge variant="outline" className="text-[10px]">Handmatig</Badge>}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(tpl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(tpl)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1.5">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {tpl.scheduleType === 'OFFSET_FROM_START' && `+${tpl.daysUntilDue} dagen`}
                      {tpl.scheduleType === 'ON_START_DATE' && 'Op startdatum'}
                      {tpl.scheduleType === 'AFTER_DEPENDENCIES' && 'Na dependencies'}
                    </span>
                    {tpl.addToCalendar && (
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <Calendar className="h-3 w-3" /> O365
                      </span>
                    )}
                    {depCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />{depCount} deps
                      </span>
                    )}
                    {hasUploads && (
                      <span className="inline-flex items-center gap-1">
                        <Upload className="h-3 w-3" />uploads
                      </span>
                    )}
                    {tpl.requireExplicitJobRole && (
                      <span className="inline-flex items-center gap-1 text-orange-600">
                        <Lock className="h-3 w-3" />expliciet per functie
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Functies: {roleCount === 0
                      ? (tpl.requireExplicitJobRole ? <span className="text-orange-600">geen enkele functie geselecteerd</span> : 'alle')
                      : `${roleCount} functie${roleCount === 1 ? '' : 's'}`}
                    {' · '}
                    Entiteiten: {entCount === 0 ? 'alle' : `${entCount}`}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-center col-span-full py-8">Geen templates gevonden.</p>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Template bewerken' : 'Nieuwe template'}</DialogTitle>
            <DialogDescription>
              Configureer type, scheduling, dependencies en uploads voor deze automatische taak.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioriteit</Label>
              <Select value={form.priority} onValueChange={(v: any) => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titel (gebruik {'{{starterName}}'}, {'{{roleTitle}}'}, {'{{entityName}}'})</Label>
            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Beschrijving</Label>
            <Textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Starter type</Label>
              <Select
                value={form.forStarterType || 'ANY'}
                onValueChange={(v) => setForm(f => ({ ...f, forStarterType: v === 'ANY' ? null : (v as any) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Alle types</SelectItem>
                  {STARTER_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduling</Label>
              <Select value={form.scheduleType} onValueChange={(v: any) => setForm(f => ({ ...f, scheduleType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dagen tot deadline</Label>
              <Input
                type="number"
                value={form.daysUntilDue}
                onChange={(e) => setForm(f => ({ ...f, daysUntilDue: parseInt(e.target.value || '0', 10) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between border rounded-md px-3 py-2">
              <span className="text-sm">Actief</span>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
            </label>
            <label className="flex items-center justify-between border rounded-md px-3 py-2">
              <span className="text-sm">Automatisch toewijzen</span>
              <Switch checked={form.autoAssign} onCheckedChange={(v) => setForm(f => ({ ...f, autoAssign: v }))} />
            </label>
            <label className="flex items-center justify-between border rounded-md px-3 py-2">
              <span className="text-sm">O365 kalender event</span>
              <Switch checked={form.addToCalendar} onCheckedChange={(v) => setForm(f => ({ ...f, addToCalendar: v }))} />
            </label>
            <label className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <div className="text-sm">Expliciete functie-match vereist</div>
                <div className="text-xs text-muted-foreground">Enkel toepassen als functie in lijst staat</div>
              </div>
              <Switch
                checked={form.requireExplicitJobRole}
                onCheckedChange={(v) => setForm(f => ({ ...f, requireExplicitJobRole: v }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Upload folder (SharePoint submap)</Label>
              <Input
                placeholder="bv. marketing"
                value={form.uploadFolder}
                onChange={(e) => setForm(f => ({ ...f, uploadFolder: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected outputs (komma-gescheiden)</Label>
              <Input
                placeholder="bv. forms-photo,linkedin,signature"
                value={form.expectedOutputs}
                onChange={(e) => setForm(f => ({ ...f, expectedOutputs: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Functies ({form.forJobRoleTitles.length}/{uniqueRoleTitles.length})</Label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  disabled={uniqueRoleTitles.length === 0 || form.forJobRoleTitles.length === uniqueRoleTitles.length}
                  onClick={() => setForm(f => ({ ...f, forJobRoleTitles: [...uniqueRoleTitles] }))}
                >
                  Alles selecteren
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  disabled={form.forJobRoleTitles.length === 0}
                  onClick={() => setForm(f => ({ ...f, forJobRoleTitles: [] }))}
                >
                  Alles wissen
                </button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 grid grid-cols-2 md:grid-cols-3 gap-1">
              {uniqueRoleTitles.map(title => (
                <label key={title} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.forJobRoleTitles.includes(title)}
                    onChange={() => toggleJobRole(title)}
                  />
                  <span className="truncate">{title}</span>
                </label>
              ))}
              {uniqueRoleTitles.length === 0 && (
                <span className="text-xs text-muted-foreground col-span-full">Geen functies gevonden.</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Entiteiten ({form.forEntityIds.length}/{entities.length})</Label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  disabled={entities.length === 0 || form.forEntityIds.length === entities.length}
                  onClick={() => setForm(f => ({ ...f, forEntityIds: entities.map(e => e.id) }))}
                >
                  Alles selecteren
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  disabled={form.forEntityIds.length === 0}
                  onClick={() => setForm(f => ({ ...f, forEntityIds: [] }))}
                >
                  Alles wissen
                </button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 grid grid-cols-2 md:grid-cols-3 gap-1">
              {entities.map(e => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.forEntityIds.includes(e.id)}
                    onChange={() => toggleEntity(e.id)}
                  />
                  <span className="truncate">{e.name}</span>
                </label>
              ))}
              {entities.length === 0 && (
                <span className="text-xs text-muted-foreground col-span-full">Geen entiteiten gevonden.</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dependencies ({form.dependsOnTemplateIds.length})</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                disabled={form.dependsOnTemplateIds.length === 0}
                onClick={() => setForm(f => ({ ...f, dependsOnTemplateIds: [] }))}
              >
                Alles wissen
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Taak blijft geblokkeerd tot <strong>alle</strong> aangevinkte templates voltooid zijn voor dezelfde starter.
            </p>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
              {templates
                .filter(t => !editing || t.id !== editing.id)
                .map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.dependsOnTemplateIds.includes(t.id)}
                      onChange={() => toggleDependency(t.id)}
                    />
                    <span className="truncate" title={t.title}>
                      <Badge variant="outline" className="mr-1 font-mono text-[9px]">{t.type}</Badge>
                      {t.title}
                    </span>
                  </label>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Opslaan…' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
