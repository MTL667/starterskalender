'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ContentBlock } from '@/lib/recruitment/types'
import { ContentBlockEditor } from '@/components/recruitment/vacancy/content-block-editor'

interface Entity {
  id: string
  name: string
}

interface JobRole {
  id: string
  title: string
  entityId: string
}

interface VacancyFormData {
  title: string
  entityId: string
  functionId: string | null
  type: string | null
  location: string | null
  description: string | null
}

interface VacancyFormProps {
  initialData?: Partial<VacancyFormData> & { id?: string }
  mode: 'create' | 'edit'
  templateId?: string | null
  templateContent?: ContentBlock[]
}

const EMPLOYMENT_TYPES = ['fulltime', 'parttime', 'interim'] as const

export function VacancyForm({ initialData, mode, templateId, templateContent }: VacancyFormProps) {
  const router = useRouter()
  const t = useTranslations('recruitment')
  const tc = useTranslations('common')

  const [formData, setFormData] = useState<VacancyFormData>({
    title: initialData?.title ?? '',
    entityId: initialData?.entityId ?? '',
    functionId: initialData?.functionId ?? null,
    type: initialData?.type ?? null,
    location: initialData?.location ?? null,
    description: initialData?.description ?? null,
  })

  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(templateContent ?? [])
  const [entities, setEntities] = useState<Entity[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/entities')
      .then((res) => res.json())
      .then((data) => setEntities(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch('/api/job-roles')
      .then((res) => res.json())
      .then((data) => setJobRoles(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const filteredJobRoles = formData.entityId
    ? jobRoles.filter((jr) => jr.entityId === formData.entityId)
    : jobRoles

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = t('fieldTitleRequired')
    if (!formData.entityId) newErrors.entityId = t('fieldEntityRequired')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setErrors({})

    try {
      const url = mode === 'edit' && initialData?.id
        ? `/api/recruitment/vacancies/${initialData.id}`
        : '/api/recruitment/vacancies'

      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          functionId: formData.functionId || null,
          type: formData.type || null,
          location: formData.location?.trim() || null,
          description: formData.description?.trim() || null,
          ...(mode === 'create' && templateId ? { templateId } : {}),
          ...(mode === 'create' && contentBlocks.length > 0 ? { content: contentBlocks } : {}),
        }),
      })

      if (!res.ok) {
        const result = await res.json()
        if (result.error?.details?.fieldErrors) {
          const fieldErrors: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(result.error.details.fieldErrors)) {
            fieldErrors[key] = (msgs as string[])[0]
          }
          setErrors(fieldErrors)
        } else {
          alert(result.error?.message || tc('error'))
        }
        return
      }

      const result = await res.json()
      const vacancyId = result.data?.id

      if (mode === 'create' && vacancyId) {
        router.push(`/recruitment/vacatures/${vacancyId}`)
      } else if (mode === 'edit' && initialData?.id) {
        router.push(`/recruitment/vacatures/${initialData.id}`)
      } else {
        router.push('/recruitment/vacatures')
      }
    } catch {
      alert(tc('error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/recruitment/vacatures"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('backToVacancies')}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">
        {mode === 'create' ? t('createVacancy') : t('editVacancy')}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">
            {t('fieldTitle')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            onBlur={() => { if (!formData.title.trim()) setErrors((prev) => ({ ...prev, title: t('fieldTitleRequired') })) }}
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="entityId">
            {t('fieldEntity')} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.entityId}
            onValueChange={(value) => {
              setFormData((prev) => ({ ...prev, entityId: value, functionId: null }))
              if (value) setErrors((prev) => { const { entityId, ...rest } = prev; return rest })
            }}
          >
            <SelectTrigger className={errors.entityId ? 'border-destructive' : ''}>
              <SelectValue placeholder={t('fieldEntity')} />
            </SelectTrigger>
            <SelectContent>
              {entities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.entityId && <p className="text-sm text-destructive">{errors.entityId}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="functionId">{t('fieldFunction')}</Label>
          <Select
            value={formData.functionId ?? ''}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, functionId: value || null }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('fieldFunctionPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {filteredJobRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">{t('fieldType')}</Label>
          <Select
            value={formData.type ?? ''}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value || null }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('fieldTypePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`type${type.charAt(0).toUpperCase() + type.slice(1)}` as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">{t('fieldLocation')}</Label>
          <Input
            id="location"
            value={formData.location ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder={t('fieldLocationPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('fieldDescription')}</Label>
          <Textarea
            id="description"
            value={formData.description ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('fieldDescriptionPlaceholder')}
            rows={5}
          />
        </div>

        {mode === 'create' && (
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('contentBlocks.sectionTitle')}</h2>
            <ContentBlockEditor blocks={contentBlocks} onChange={setContentBlocks} />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? t('saving') : tc('save')}
          </Button>
          <Link href="/recruitment/vacatures">
            <Button type="button" variant="outline">
              {tc('cancel')}
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
