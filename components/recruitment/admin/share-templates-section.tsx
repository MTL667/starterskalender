'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Star, Pencil } from 'lucide-react'
import { FieldPicker } from '@/components/recruitment/share/field-picker'

interface TemplateData {
  id: string
  name: string
  description: string | null
  visibleFields: string[]
  isDefault: boolean
  usageCount: number
}

export function ShareTemplatesSection() {
  const t = useTranslations('recruitment.settings')
  const ts = useTranslations('recruitment.share')
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await fetch('/api/recruitment/admin/share-templates')
      if (res.ok) {
        const json = await res.json()
        setTemplates(json.data ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    try {
      const res = await fetch(`/api/recruitment/admin/share-templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id))
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Share Templates</h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Template toevoegen
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">Nog geen share templates geconfigureerd. De standaard templates worden gebruikt.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) =>
            editingId === tmpl.id ? (
              <TemplateForm
                key={tmpl.id}
                initial={tmpl}
                onSave={() => { setEditingId(null); fetchTemplates() }}
                onCancel={() => setEditingId(null)}
                ts={ts}
              />
            ) : (
              <div key={tmpl.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tmpl.name}</span>
                    {tmpl.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(tmpl.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tmpl.id)}
                      disabled={tmpl.usageCount > 0}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {tmpl.description && (
                  <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {tmpl.visibleFields.map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {ts(`field${field.charAt(0).toUpperCase() + field.slice(1)}` as any)}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gebruikt: {tmpl.usageCount}x
                </p>
              </div>
            )
          )}
        </div>
      )}

      {showForm && (
        <TemplateForm
          onSave={() => { setShowForm(false); fetchTemplates() }}
          onCancel={() => setShowForm(false)}
          ts={ts}
        />
      )}
    </div>
  )
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
  ts,
}: {
  initial?: TemplateData
  onSave: () => void
  onCancel: () => void
  ts: ReturnType<typeof useTranslations>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [fields, setFields] = useState<string[]>(initial?.visibleFields ?? [])
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || fields.length === 0) return
    setSaving(true)
    try {
      const url = initial
        ? `/api/recruitment/admin/share-templates/${initial.id}`
        : '/api/recruitment/admin/share-templates'
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, visibleFields: fields, isDefault }),
      })
      if (res.ok) onSave()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Naam</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
            placeholder="bv. Technische review"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Beschrijving</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
            placeholder="Optioneel"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Velden</label>
        <FieldPicker selectedFields={fields} onChange={setFields} />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        Standaard template (voorgeselecteerd in de share dialog)
      </label>

      {fields.length === 0 && (
        <p className="text-sm text-amber-600">{ts('selectFields')}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Annuleren</Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving || !name.trim() || fields.length === 0}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          {initial ? 'Opslaan' : 'Aanmaken'}
        </Button>
      </div>
    </div>
  )
}
