'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Share2 } from 'lucide-react'
import { ShareTemplateSelector } from './share-template-selector'
import { FieldPicker } from './field-picker'
import { DEFAULT_SHARE_TEMPLATES } from '@/lib/recruitment/share-templates'
import { ALL_SHAREABLE_FIELD_KEYS } from '@/lib/recruitment/field-mask'

interface ShareDialogProps {
  candidateId: string
  candidateName: string
  open: boolean
  onClose: () => void
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

const DURATION_OPTIONS = [
  { value: 'after-evaluation', labelKey: 'durationAfterEvaluation' },
  { value: '24h', labelKey: 'duration24h' },
  { value: '7d', labelKey: 'duration7d' },
  { value: '30d', labelKey: 'duration30d' },
  { value: 'permanent', labelKey: 'durationPermanent' },
] as const

function computeExpiresAt(duration: string): string | null {
  const now = new Date()
  switch (duration) {
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return null
  }
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  firstName: 'fieldFirstName',
  lastName: 'fieldLastName',
  email: 'fieldEmail',
  phone: 'fieldPhone',
  source: 'fieldSource',
  niceToHaveScore: 'fieldNiceToHaveScore',
  dealbreakersResult: 'fieldDealbreakersResult',
  cv: 'fieldCv',
  motivation: 'fieldMotivation',
  appliedAt: 'fieldAppliedAt',
  verifiedAt: 'fieldVerifiedAt',
  stage: 'fieldStage',
}

export function ShareDialog({ candidateId, candidateName, open, onClose }: ShareDialogProps) {
  const t = useTranslations('recruitment.share')

  const [users, setUsers] = useState<UserOption[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('technical-review')
  const [visibleFields, setVisibleFields] = useState<string[]>(
    DEFAULT_SHARE_TEMPLATES[0].visibleFields
  )
  const [duration, setDuration] = useState('after-evaluation')
  const [submitting, setSubmitting] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [adminTemplates, setAdminTemplates] = useState<
    { id: string; name: string; description: string | null; visibleFields: string[]; isDefault: boolean }[]
  >([])

  useEffect(() => {
    if (!open) return
    setLoadingUsers(true)
    fetch('/api/recruitment/users')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => {
        const raw = json.data ?? json
        const list = (Array.isArray(raw) ? raw : []) as UserOption[]
        setUsers(list)
      })
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))

    fetch('/api/recruitment/admin/share-templates')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => {
        const list = json.data ?? []
        setAdminTemplates(list)
        const defaultTmpl = list.find((t: any) => t.isDefault)
        if (defaultTmpl) {
          setSelectedTemplate(defaultTmpl.id)
          setVisibleFields(defaultTmpl.visibleFields)
        }
      })
      .catch(() => setAdminTemplates([]))
  }, [open])

  const handleTemplateSelect = useCallback((templateId: string, fields: string[]) => {
    setSelectedTemplate(templateId)
    if (templateId !== 'custom') {
      setVisibleFields(fields)
    }
  }, [])

  const handleCustomFieldsChange = useCallback((fields: string[]) => {
    setVisibleFields(fields)
  }, [])

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const canSubmit = selectedUserId && visibleFields.length > 0 && !submitting

  const filteredUsers = users.filter((u) => {
    const search = userSearch.toLowerCase()
    if (!search) return true
    return (
      (u.name?.toLowerCase().includes(search) ?? false) ||
      u.email.toLowerCase().includes(search)
    )
  })

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/recruitment/candidates/${candidateId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          visibleFields,
          expiresAt: computeExpiresAt(duration),
          templateId: adminTemplates.find((t) => t.id === selectedTemplate)?.id ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Share failed')
      }
      onClose()
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('title')} — {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Reviewer picker */}
          <div>
            <label className="text-sm font-medium">{t('shareWith')}</label>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t('searchUsers')}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-background"
            />
            {loadingUsers ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="mt-1 max-h-32 overflow-y-auto border rounded-md">
                {filteredUsers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">{t('noUsersFound')}</div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setSelectedUserId(u.id); setUserSearch(u.name ?? u.email) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                        selectedUserId === u.id ? 'bg-blue-50 dark:bg-blue-950' : ''
                      }`}
                    >
                      <span className="font-medium">{u.name ?? u.email}</span>
                      {u.name && (
                        <span className="text-muted-foreground ml-2">{u.email}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Template selector */}
          <div>
            <label className="text-sm font-medium">{t('shareProfile')}</label>
            <div className="mt-2">
              <ShareTemplateSelector
                selected={selectedTemplate}
                onSelect={handleTemplateSelect}
                adminTemplates={adminTemplates}
              />
            </div>
          </div>

          {/* Field picker (custom mode) */}
          {selectedTemplate === 'custom' && (
            <div>
              <FieldPicker
                selectedFields={visibleFields}
                onChange={handleCustomFieldsChange}
              />
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="text-sm font-medium">{t('accessDuration')}</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-background"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Field preview */}
          <div>
            <label className="text-sm font-medium">
              {t('preview', { name: selectedUser?.name ?? '...' })}
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_SHAREABLE_FIELD_KEYS.map((field) => {
                const visible = visibleFields.includes(field)
                return (
                  <Badge
                    key={field}
                    variant={visible ? 'default' : 'outline'}
                    className={visible ? '' : 'opacity-40 line-through'}
                  >
                    {t(FIELD_LABEL_KEYS[field] ?? field)}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Validation message */}
          {selectedTemplate === 'custom' && visibleFields.length === 0 && (
            <p className="text-sm text-amber-600">{t('selectFields')}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('sharing')}</>
              ) : (
                t('shareButton', { name: selectedUser?.name ?? '...' })
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
