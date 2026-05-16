'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { ContentBlockEditor } from '@/components/recruitment/vacancy/content-block-editor'
import { ScorecardCriteriaConfig } from '@/components/recruitment/vacancy/scorecard-criteria-config'
import type { ContentBlock, VacancyScorecardCriterion } from '@/lib/recruitment/types'

interface Entity {
  id: string
  name: string
}

interface JobRole {
  id: string
  title: string
  entityId: string
}

const DEFAULT_STAGES = [
  { name: 'Applied', order: 0 },
  { name: 'Screening', order: 1 },
  { name: 'Interview', order: 2 },
  { name: 'Offer', order: 3 },
  { name: 'Hired', order: 4 },
  { name: 'Rejected', order: 5 },
]

export function TemplateForm() {
  const t = useTranslations('recruitment')
  const router = useRouter()

  const [name, setName] = useState('')
  const [entityId, setEntityId] = useState('')
  const [functionId, setFunctionId] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [stages, setStages] = useState(DEFAULT_STAGES.map((s) => s.name))
  const [dealbreakers, setDealbreakers] = useState<string[]>([])
  const [niceToHaves, setNiceToHaves] = useState<{ text: string; weight: number }[]>([])
  const [scorecardCriteria, setScorecardCriteria] = useState<VacancyScorecardCriterion[]>([])

  const [entities, setEntities] = useState<Entity[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/entities').then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setEntities(Array.isArray(data) ? data : data.data ?? [])
      }
    })
    fetch('/api/job-roles').then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setJobRoles(Array.isArray(data) ? data : data.data ?? [])
      }
    })
  }, [])

  const filteredRoles = entityId
    ? jobRoles.filter((r) => r.entityId === entityId)
    : jobRoles

  const handleSubmit = async () => {
    if (!name.trim() || !entityId) return
    setSaving(true)

    try {
      const res = await fetch('/api/recruitment/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          entityId,
          functionId: functionId || null,
          content: blocks,
          stages: stages.map((s, i) => ({ name: s, order: i })),
          dealbreakers: dealbreakers.filter(Boolean).map((text) => ({ text })),
          niceToHaves: niceToHaves.filter((n) => n.text.trim()).map((n) => ({ text: n.text, weight: n.weight })),
          scorecardCriteria: scorecardCriteria.filter((c) => c.name.trim()),
        }),
      })

      if (res.ok) {
        router.push('/recruitment/admin/templates')
      } else {
        alert(t('templates.saveFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/recruitment/admin/templates"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('templates.backToTemplates')}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">{t('templates.createTemplate')}</h1>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <Label htmlFor="name">{t('templates.fieldName')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('templates.fieldNamePlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t('fieldEntity')} *</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('fieldEntity')} />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('fieldFunction')}</Label>
            <Select
              value={functionId ?? ''}
              onValueChange={(v) => setFunctionId(v || null)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('fieldFunctionPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {filteredRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content blocks */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('contentBlocks.sectionTitle')}</h2>
          <ContentBlockEditor blocks={blocks} onChange={setBlocks} />
        </div>

        {/* Pipeline stages */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('templates.stagesTitle')}</h2>
          <div className="space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}.</span>
                <Input
                  value={stage}
                  onChange={(e) => {
                    const updated = [...stages]
                    updated[i] = e.target.value
                    setStages(updated)
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setStages(stages.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStages([...stages, ''])}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('templates.addStage')}
            </Button>
          </div>
        </div>

        {/* Dealbreakers */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('templates.dealbreakersTitle')}</h2>
          <div className="space-y-2">
            {dealbreakers.map((db, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={db}
                  onChange={(e) => {
                    const updated = [...dealbreakers]
                    updated[i] = e.target.value
                    setDealbreakers(updated)
                  }}
                  placeholder={t('templates.dealbreakerPlaceholder')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setDealbreakers(dealbreakers.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDealbreakers([...dealbreakers, ''])}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('templates.addDealbreaker')}
            </Button>
          </div>
        </div>

        {/* Nice-to-haves */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('templates.niceToHavesTitle')}</h2>
          <div className="space-y-2">
            {niceToHaves.map((nth, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={nth.text}
                  onChange={(e) => {
                    const updated = [...niceToHaves]
                    updated[i] = { ...updated[i], text: e.target.value }
                    setNiceToHaves(updated)
                  }}
                  placeholder={t('templates.niceToHavePlaceholder')}
                  className="flex-1"
                />
                <Select
                  value={String(nth.weight)}
                  onValueChange={(v) => {
                    const updated = [...niceToHaves]
                    updated[i] = { ...updated[i], weight: Number(v) }
                    setNiceToHaves(updated)
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                      <SelectItem key={w} value={String(w)}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setNiceToHaves(niceToHaves.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNiceToHaves([...niceToHaves, { text: '', weight: 5 }])}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('templates.addNiceToHave')}
            </Button>
          </div>
        </div>

        {/* Scorecard Criteria */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('scorecard.tabTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('scorecard.sectionDescription')}</p>
          <ScorecardCriteriaConfig
            criteria={scorecardCriteria}
            onChange={setScorecardCriteria}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/recruitment/admin/templates">
            <Button variant="outline">{t('templates.cancel')}</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={saving || !name.trim() || !entityId}>
            {saving ? t('saving') : t('templates.saveTemplate')}
          </Button>
        </div>
      </div>
    </div>
  )
}
