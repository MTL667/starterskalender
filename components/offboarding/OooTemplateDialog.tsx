'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Save, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface OooTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  jobRoleId: string
  jobRoleTitle: string
  onSaved: () => void
}

export function OooTemplateDialog({ open, onOpenChange, entityId, jobRoleId, jobRoleTitle, onSaved }: OooTemplateDialogProps) {
  const t = useTranslations('offboarding')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    templateNl: '',
    templateFr: '',
    templateEn: '',
    generalMailAddress: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch(`/api/admin/ooo-templates/${entityId}/${jobRoleId}`)
      .then(res => {
        if (res.ok) return res.json()
        return null
      })
      .then(data => {
        if (data) {
          setForm({
            templateNl: data.templateNl || '',
            templateFr: data.templateFr || '',
            templateEn: data.templateEn || '',
            generalMailAddress: data.generalMailAddress || '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, entityId, jobRoleId])

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
      onOpenChange(false)
      onSaved()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('oooTemplateDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('oooTemplateDialogDescription', { role: jobRoleTitle })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ooo-generalMailAddress">{t('oooGeneralMailAddress')}</Label>
              <Input
                id="ooo-generalMailAddress"
                type="email"
                value={form.generalMailAddress}
                onChange={(e) => setForm({ ...form, generalMailAddress: e.target.value })}
                placeholder="info@company.be"
              />
            </div>

            <div>
              <Label htmlFor="ooo-templateNl">Template (NL)</Label>
              <Textarea
                id="ooo-templateNl"
                value={form.templateNl}
                onChange={(e) => setForm({ ...form, templateNl: e.target.value })}
                rows={4}
                placeholder="Beste, {voornaam} {achternaam} is niet langer werkzaam bij ons. Voor vragen contacteer {algemeen_mailadres}."
              />
            </div>

            <div>
              <Label htmlFor="ooo-templateFr">Template (FR)</Label>
              <Textarea
                id="ooo-templateFr"
                value={form.templateFr}
                onChange={(e) => setForm({ ...form, templateFr: e.target.value })}
                rows={4}
                placeholder="Bonjour, {voornaam} {achternaam} ne travaille plus chez nous. Pour toute question, contactez {algemeen_mailadres}."
              />
            </div>

            <div>
              <Label htmlFor="ooo-templateEn">Template (EN)</Label>
              <Textarea
                id="ooo-templateEn"
                value={form.templateEn}
                onChange={(e) => setForm({ ...form, templateEn: e.target.value })}
                rows={4}
                placeholder="Hello, {voornaam} {achternaam} is no longer with our organization. Please contact {algemeen_mailadres}."
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t('oooVariablesHint')}
            </p>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('back')}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {t('oooTemplateSave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
