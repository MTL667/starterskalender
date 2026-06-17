'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mail, Save, Loader2, Eye } from 'lucide-react'

interface OooTemplate {
  id: string
  entityId: string
  jobRoleId: string | null
  templateNl: string
  templateFr: string
  templateEn: string
  generalMailAddress: string
}

interface OooTemplateEditorProps {
  entityId: string
  jobRoleId: string
  jobRoleTitle: string
}

export function OooTemplateEditor({ entityId, jobRoleId, jobRoleTitle }: OooTemplateEditorProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasTemplate, setHasTemplate] = useState(false)
  const [form, setForm] = useState({
    templateNl: '',
    templateFr: '',
    templateEn: '',
    generalMailAddress: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ previewNl: string; previewFr: string; previewEn: string } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    if (!open) return
    loadTemplate()
  }, [open])

  async function loadTemplate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ooo-templates/${entityId}/${jobRoleId}`)
      if (res.ok) {
        const data: OooTemplate = await res.json()
        setForm({
          templateNl: data.templateNl,
          templateFr: data.templateFr,
          templateEn: data.templateEn,
          generalMailAddress: data.generalMailAddress,
        })
        setHasTemplate(true)
      } else if (res.status === 404) {
        setHasTemplate(false)
      }
    } catch {
      setError('Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  async function handlePreview() {
    setPreviewing(true)
    setPreview(null)
    try {
      const res = await fetch(`/api/admin/ooo-templates/${entityId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setPreview(await res.json())
      }
    } catch {
      // silent — preview is optional
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ooo-templates/${entityId}/${jobRoleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.details ? Object.values(data.details).flat().join(', ') : data.message || 'Save failed')
        return
      }
      setHasTemplate(true)
      setOpen(false)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1"
        title="OOO Template"
      >
        <Mail className="h-3.5 w-3.5" />
        <span className="text-xs">{hasTemplate ? 'OOO' : 'OOO+'}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>OOO Template — {jobRoleTitle}</DialogTitle>
            <DialogDescription>
              Auto-reply template for offboarding. Variables: {'{voornaam}'}, {'{achternaam}'}, {'{algemeen_mailadres}'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="generalMailAddress">General mail address</Label>
                <Input
                  id="generalMailAddress"
                  type="email"
                  value={form.generalMailAddress}
                  onChange={(e) => setForm({ ...form, generalMailAddress: e.target.value })}
                  placeholder="info@company.be"
                />
              </div>

              <div>
                <Label htmlFor="templateNl">Template (NL)</Label>
                <Textarea
                  id="templateNl"
                  value={form.templateNl}
                  onChange={(e) => setForm({ ...form, templateNl: e.target.value })}
                  rows={4}
                  placeholder="Beste, {voornaam} {achternaam} is niet langer werkzaam bij ons. Voor vragen contacteer {algemeen_mailadres}."
                />
              </div>

              <div>
                <Label htmlFor="templateFr">Template (FR)</Label>
                <Textarea
                  id="templateFr"
                  value={form.templateFr}
                  onChange={(e) => setForm({ ...form, templateFr: e.target.value })}
                  rows={4}
                  placeholder="Bonjour, {voornaam} {achternaam} ne travaille plus chez nous. Pour toute question, contactez {algemeen_mailadres}."
                />
              </div>

              <div>
                <Label htmlFor="templateEn">Template (EN)</Label>
                <Textarea
                  id="templateEn"
                  value={form.templateEn}
                  onChange={(e) => setForm({ ...form, templateEn: e.target.value })}
                  rows={4}
                  placeholder="Hello, {voornaam} {achternaam} is no longer with our organization. Please contact {algemeen_mailadres}."
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {preview && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/50">
                  <p className="text-xs font-medium">Preview (NL):</p>
                  <p className="text-sm whitespace-pre-wrap">{preview.previewNl}</p>
                  <p className="text-xs font-medium mt-2">Preview (FR):</p>
                  <p className="text-sm whitespace-pre-wrap">{preview.previewFr}</p>
                  <p className="text-xs font-medium mt-2">Preview (EN):</p>
                  <p className="text-sm whitespace-pre-wrap">{preview.previewEn}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handlePreview} disabled={previewing || loading}>
              {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
