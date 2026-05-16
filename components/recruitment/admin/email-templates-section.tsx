'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
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
import { Loader2, Plus, Trash2, Pencil, Eye, AlertTriangle, Copy } from 'lucide-react'

interface EmailTemplateData {
  id: string
  entityId: string
  type: 'STAGE_TRANSITION' | 'APPLICATION_CONFIRMATION' | 'REJECTION'
  name: string
  subject: string
  body: string
  isActive: boolean
  createdBy: { id: string; name: string | null }
  createdAt: string
}

interface EntityOption {
  id: string
  name: string
}

const TEMPLATE_TYPES = ['STAGE_TRANSITION', 'APPLICATION_CONFIRMATION', 'REJECTION'] as const

export function EmailTemplatesSection() {
  const t = useTranslations('recruitment.emailTemplates')
  const ts = useTranslations('recruitment.settings')
  const [templates, setTemplates] = useState<EmailTemplateData[]>([])
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateData | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchTemplates()
    fetchEntities()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await fetch('/api/recruitment/admin/email-templates')
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

  async function fetchEntities() {
    try {
      const res = await fetch('/api/entities')
      if (res.ok) {
        const json = await res.json()
        setEntities(json.data ?? json ?? [])
      }
    } catch {
      // silent
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(ts('confirmDelete'))) return
    try {
      const res = await fetch(`/api/recruitment/admin/email-templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id))
      }
    } catch {
      // silent
    }
  }

  async function handleToggleActive(template: EmailTemplateData) {
    try {
      const res = await fetch(`/api/recruitment/admin/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      })
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((tmpl) =>
            tmpl.id === template.id ? { ...tmpl, isActive: !tmpl.isActive } : tmpl
          )
        )
      }
    } catch {
      // silent
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'STAGE_TRANSITION': return t('typeStageTransition')
      case 'APPLICATION_CONFIRMATION': return t('typeApplicationConfirmation')
      case 'REJECTION': return t('typeRejection')
      default: return type
    }
  }

  const grouped = TEMPLATE_TYPES.map((type) => ({
    type,
    label: getTypeLabel(type),
    templates: templates.filter((tmpl) => tmpl.type === type),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t('create')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t('noTemplates')}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            group.templates.length > 0 && (
              <div key={group.type} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
                <div className="space-y-2">
                  {group.templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{tmpl.name}</p>
                          <p className="text-xs text-muted-foreground">{tmpl.subject}</p>
                        </div>
                        <Badge variant={tmpl.isActive ? 'default' : 'secondary'}>
                          {tmpl.isActive ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(tmpl)}
                          title={tmpl.isActive ? t('deactivate') : t('activate')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTemplate(tmpl)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tmpl.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {showCreateDialog && (
        <EmailTemplateFormDialog
          entities={entities}
          onClose={() => setShowCreateDialog(false)}
          onSaved={() => {
            setShowCreateDialog(false)
            fetchTemplates()
          }}
        />
      )}

      {editingTemplate && (
        <EmailTemplateFormDialog
          entities={entities}
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => {
            setEditingTemplate(null)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}

interface FormDialogProps {
  entities: EntityOption[]
  template?: EmailTemplateData | null
  onClose: () => void
  onSaved: () => void
}

function EmailTemplateFormDialog({ entities, template, onClose, onSaved }: FormDialogProps) {
  const t = useTranslations('recruitment.emailTemplates')
  const isEditing = !!template

  const [name, setName] = useState(template?.name ?? '')
  const [type, setType] = useState<string>(template?.type ?? 'STAGE_TRANSITION')
  const [entityId, setEntityId] = useState(template?.entityId ?? entities[0]?.id ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [unresolvedVars, setUnresolvedVars] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const fetchPreview = useCallback(async () => {
    if (!body.trim()) {
      setPreviewHtml(null)
      setUnresolvedVars([])
      return
    }
    try {
      const res = await fetch('/api/recruitment/admin/email-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, subject }),
      })
      if (res.ok) {
        const json = await res.json()
        setPreviewHtml(json.data.renderedBody)
        setUnresolvedVars(json.data.unresolvedVariables ?? [])
      }
    } catch {
      // silent
    }
  }, [body, subject])

  useEffect(() => {
    if (!showPreview) return
    const timer = setTimeout(fetchPreview, 500)
    return () => clearTimeout(timer)
  }, [body, subject, showPreview, fetchPreview])

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const url = isEditing
        ? `/api/recruitment/admin/email-templates/${template!.id}`
        : '/api/recruitment/admin/email-templates'

      const payload = isEditing
        ? { name, subject, body }
        : { entityId, type, name, subject, body }

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error?.message ?? 'Failed to save')
        return
      }

      onSaved()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const variables = [
    'candidate_name', 'candidate_first_name', 'candidate_last_name',
    'vacancy_title', 'entity_name', 'stage_name',
    'rejection_reason', 'application_date', 'portal_link',
  ]

  function insertVariable(varName: string) {
    setBody((prev) => prev + `{{${varName}}}`)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mt-4">
          <div className="space-y-4">
            {!isEditing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">{t('fieldEntity')}</label>
                  <Select value={entityId} onValueChange={setEntityId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('fieldType')}</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAGE_TRANSITION">{t('typeStageTransition')}</SelectItem>
                      <SelectItem value="APPLICATION_CONFIRMATION">{t('typeApplicationConfirmation')}</SelectItem>
                      <SelectItem value="REJECTION">{t('typeRejection')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{t('fieldName')}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} />
            </div>

            <div>
              <label className="text-sm font-medium">{t('fieldSubject')}</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('subjectPlaceholder')} />
            </div>

            <div>
              <label className="text-sm font-medium">{t('fieldBody')}</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm resize-y bg-background"
                placeholder={t('bodyPlaceholder')}
              />
            </div>

            {unresolvedVars.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span>{t('unresolvedWarning')}: {unresolvedVars.map(v => `{{${v}}}`).join(', ')}</span>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving || !name || !subject || !body || (!isEditing && !entityId)}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {isEditing ? t('save') : t('create')}
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="h-4 w-4 mr-1" />
                {showPreview ? t('hidePreview') : t('showPreview')}
              </Button>
              <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">{t('availableVariables')}</h4>
              <div className="flex flex-wrap gap-1">
                {variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border bg-muted hover:bg-accent transition-colors"
                    title={t(`vars.${v.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)}
                  >
                    <Copy className="h-3 w-3" />
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            {showPreview && previewHtml && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('preview')}</h4>
                <div
                  className="border rounded-md p-3 bg-white dark:bg-gray-900 text-sm max-h-[400px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
