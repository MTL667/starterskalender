'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { VacancyForm } from '@/components/recruitment/vacancy/vacancy-form'
import { ContentBlockEditor } from '@/components/recruitment/vacancy/content-block-editor'
import { DealbreakersConfig } from '@/components/recruitment/vacancy/dealbreakers-config'
import { ScorecardCriteriaConfig } from '@/components/recruitment/vacancy/scorecard-criteria-config'
import { StageConfigurator } from '@/components/recruitment/vacancy/stage-configurator'
import { VacancyStatusActions } from '@/components/recruitment/vacancy/vacancy-status-actions'
import { Button } from '@/components/ui/button'
import type { ContentBlock, VacancyDealbreaker, VacancyNiceToHave, VacancyScorecardCriterion } from '@/lib/recruitment/types'

const AUTOSAVE_INTERVAL_MS = 30_000

interface StageData {
  id: string
  name: string
  order: number
  isTerminal: boolean
  triggersEmail: boolean
}

interface VacancyData {
  id: string
  title: string
  entityId: string
  functionId: string | null
  type: string | null
  location: string | null
  description: string | null
  content: ContentBlock[] | null
  dealbreakers: VacancyDealbreaker[] | null
  niceToHaves: VacancyNiceToHave[] | null
  scorecardCriteria: VacancyScorecardCriterion[] | null
  stages: StageData[]
  status: string
  _count?: { evaluations: number }
}

export function VacancyEditClient({ vacancyId }: { vacancyId: string }) {
  const t = useTranslations('recruitment')
  const [vacancy, setVacancy] = useState<VacancyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [dealbreakers, setDealbreakers] = useState<VacancyDealbreaker[]>([])
  const [niceToHaves, setNiceToHaves] = useState<VacancyNiceToHave[]>([])
  const [scorecardCriteria, setScorecardCriteria] = useState<VacancyScorecardCriterion[]>([])
  const [scorecardSaveStatus, setScorecardSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [criteriaSaveStatus, setCriteriaSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const blocksRef = useRef<ContentBlock[]>([])
  const dirtyRef = useRef(false)

  useEffect(() => {
    fetch(`/api/recruitment/vacancies/${vacancyId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Not found')
        const result = await res.json()
        setVacancy(result.data)
        const parsed = Array.isArray(result.data.content) ? result.data.content : []
        setBlocks(parsed)
        blocksRef.current = parsed
        setDealbreakers(Array.isArray(result.data.dealbreakers) ? result.data.dealbreakers : [])
        setNiceToHaves(Array.isArray(result.data.niceToHaves) ? result.data.niceToHaves : [])
        setScorecardCriteria(Array.isArray(result.data.scorecardCriteria) ? result.data.scorecardCriteria : [])
      })
      .catch(() => setError(t('loadingVacancy')))
      .finally(() => setLoading(false))
  }, [vacancyId, t])

  const saveContent = useCallback(async () => {
    if (!dirtyRef.current) return
    const snapshot = blocksRef.current
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: snapshot }),
      })
      if (!res.ok) throw new Error('Save failed')
      if (blocksRef.current === snapshot) {
        dirtyRef.current = false
      }
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [vacancyId])

  useEffect(() => {
    const interval = setInterval(() => {
      saveContent()
    }, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [saveContent])

  const handleBlocksChange = useCallback((updated: ContentBlock[]) => {
    setBlocks(updated)
    blocksRef.current = updated
    dirtyRef.current = true
    setSaveStatus('idle')
  }, [])

  const saveCriteria = useCallback(async () => {
    setCriteriaSaveStatus('saving')
    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealbreakers, niceToHaves }),
      })
      if (!res.ok) throw new Error('Save failed')
      setCriteriaSaveStatus('saved')
    } catch {
      setCriteriaSaveStatus('error')
    }
  }, [vacancyId, dealbreakers, niceToHaves])

  const saveScorecard = useCallback(async () => {
    setScorecardSaveStatus('saving')
    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scorecardCriteria }),
      })
      if (!res.ok) throw new Error('Save failed')
      setScorecardSaveStatus('saved')
    } catch {
      setScorecardSaveStatus('error')
    }
  }, [vacancyId, scorecardCriteria])

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !vacancy) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-destructive">{error || t('loadingVacancy')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="container mx-auto max-w-2xl">
        <VacancyStatusActions
          vacancyId={vacancy.id}
          status={vacancy.status}
          onStatusChange={(newStatus) => setVacancy((prev) => prev ? { ...prev, status: newStatus } : prev)}
        />
      </div>

      <VacancyForm
        mode="edit"
        initialData={{
          id: vacancy.id,
          title: vacancy.title,
          entityId: vacancy.entityId,
          functionId: vacancy.functionId,
          type: vacancy.type,
          location: vacancy.location,
          description: vacancy.description,
        }}
      />

      <div className="container mx-auto max-w-2xl">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('contentBlocks.sectionTitle')}</h2>
            <span className="text-xs text-muted-foreground">
              {saveStatus === 'saving' && t('contentBlocks.saving')}
              {saveStatus === 'saved' && t('contentBlocks.saved')}
              {saveStatus === 'error' && t('contentBlocks.saveError')}
            </span>
          </div>
          <ContentBlockEditor blocks={blocks} onChange={handleBlocksChange} vacancyId={vacancy.id} entityId={vacancy.entityId} />
        </div>
      </div>

      <div className="container mx-auto max-w-2xl">
        <details className="rounded-lg border bg-card">
          <summary className="cursor-pointer p-6 font-semibold text-lg">
            {t('pipeline.configTitle')}
          </summary>
          <div className="px-6 pb-6">
            <StageConfigurator vacancyId={vacancy.id} initialStages={vacancy.stages ?? []} />
          </div>
        </details>
      </div>

      <div className="container mx-auto max-w-2xl">
        <details className="rounded-lg border bg-card">
          <summary className="cursor-pointer p-6 font-semibold text-lg">
            {t('criteria.sectionTitle')}
          </summary>
          <div className="px-6 pb-6 space-y-4">
            <DealbreakersConfig
              dealbreakers={dealbreakers}
              niceToHaves={niceToHaves}
              onDealbreakersChange={(v) => { setDealbreakers(v); setCriteriaSaveStatus('idle') }}
              onNiceToHavesChange={(v) => { setNiceToHaves(v); setCriteriaSaveStatus('idle') }}
            />
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={saveCriteria} disabled={criteriaSaveStatus === 'saving'}>
                {criteriaSaveStatus === 'saving' ? t('criteria.saving') : t('criteria.save')}
              </Button>
              {criteriaSaveStatus === 'saved' && (
                <span className="text-sm text-green-600">{t('criteria.saved')}</span>
              )}
              {criteriaSaveStatus === 'error' && (
                <span className="text-sm text-destructive">{t('criteria.saveError')}</span>
              )}
            </div>
          </div>
        </details>
      </div>

      <div className="container mx-auto max-w-2xl">
        <details className="rounded-lg border bg-card">
          <summary className="cursor-pointer p-6 font-semibold text-lg">
            {t('scorecard.tabTitle')}
          </summary>
          <div className="px-6 pb-6 space-y-4">
            <p className="text-sm text-muted-foreground">{t('scorecard.sectionDescription')}</p>
            <ScorecardCriteriaConfig
              criteria={scorecardCriteria}
              onChange={(v) => { setScorecardCriteria(v); setScorecardSaveStatus('idle') }}
              evaluationCount={vacancy._count?.evaluations ?? 0}
            />
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={saveScorecard} disabled={scorecardSaveStatus === 'saving'}>
                {scorecardSaveStatus === 'saving' ? t('scorecard.saving') : t('scorecard.save')}
              </Button>
              {scorecardSaveStatus === 'saved' && (
                <span className="text-sm text-green-600">{t('scorecard.saved')}</span>
              )}
              {scorecardSaveStatus === 'error' && (
                <span className="text-sm text-destructive">{t('scorecard.saveError')}</span>
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
