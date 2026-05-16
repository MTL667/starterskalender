'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { ScoreRing } from './score-ring'
import { daysInStage, type PipelineCandidateItem } from './candidate-card'

interface CriterionReview {
  evaluatorName: string
  score: number
  comment: string | null
}

interface CriterionBreakdown {
  criterionId: string
  name: string
  average: number | null
  reviews: CriterionReview[]
}

interface CandidateEvalData {
  candidateId: string
  candidate: PipelineCandidateItem
  aggregate: {
    overallAverage: number | null
    reviewCount: number
    criteria: CriterionBreakdown[]
  } | null
  error?: boolean
}

interface CandidateComparisonDialogProps {
  open: boolean
  candidates: PipelineCandidateItem[]
  onClose: () => void
}

export function CandidateComparisonDialog({
  open,
  candidates,
  onClose,
}: CandidateComparisonDialogProps) {
  const t = useTranslations('recruitment')
  const [evalData, setEvalData] = useState<CandidateEvalData[]>([])
  const [loading, setLoading] = useState(true)
  const [columns, setColumns] = useState<string[]>(() => candidates.map((c) => c.id))

  useEffect(() => {
    if (!open || candidates.length === 0) return
    setColumns(candidates.map((c) => c.id))
    setLoading(true)

    const controller = new AbortController()

    Promise.all(
      candidates.map(async (candidate) => {
        try {
          const res = await fetch(`/api/recruitment/candidates/${candidate.id}/evaluations`, {
            signal: controller.signal,
          })
          if (!res.ok) return { candidateId: candidate.id, candidate, aggregate: null, error: true }
          const json = await res.json()
          return { candidateId: candidate.id, candidate, aggregate: json.data.aggregate }
        } catch {
          return { candidateId: candidate.id, candidate, aggregate: null, error: true }
        }
      })
    )
      .then((results) => {
        if (!controller.signal.aborted) {
          setEvalData(results)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [open, candidates])

  const visibleData = useMemo(
    () => evalData.filter((d) => columns.includes(d.candidateId)),
    [evalData, columns]
  )

  const allCriteria = useMemo(() => {
    const first = visibleData.find((d) => d.aggregate?.criteria?.length)
    return first?.aggregate?.criteria?.map((c) => ({ id: c.criterionId, name: c.name })) ?? []
  }, [visibleData])

  const highlights = useMemo(() => {
    const result: Record<string, { isHighest: boolean; hasGap: boolean }> = {}

    for (const criterion of allCriteria) {
      const scores = visibleData
        .map((d) => {
          const c = d.aggregate?.criteria.find((x) => x.criterionId === criterion.id)
          return { candidateId: d.candidateId, avg: c?.average ?? null }
        })
        .filter((s) => s.avg !== null) as { candidateId: string; avg: number }[]

      if (scores.length === 0) continue

      const maxScore = Math.max(...scores.map((s) => s.avg))
      const minScore = Math.min(...scores.map((s) => s.avg))
      const hasGap = maxScore - minScore > 1

      for (const s of scores) {
        const key = `${s.candidateId}:${criterion.id}`
        result[key] = {
          isHighest: s.avg === maxScore && scores.length > 1,
          hasGap,
        }
      }
    }
    return result
  }, [allCriteria, visibleData])

  function removeColumn(candidateId: string) {
    const next = columns.filter((id) => id !== candidateId)
    if (next.length < 2) {
      onClose()
    } else {
      setColumns(next)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t('comparison.title')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 bg-background z-10 text-left p-2 min-w-[140px]" />
                  {visibleData.map((d) => (
                    <th key={d.candidateId} scope="col" className="p-2 text-center min-w-[160px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-medium truncate">
                          {d.candidate.firstName} {d.candidate.lastName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeColumn(d.candidateId)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          aria-label={t('comparison.removeColumn')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Overall score row */}
                <tr className="border-t">
                  <th scope="row" className="sticky left-0 bg-background z-10 p-2 text-left font-medium text-muted-foreground">
                    {t('comparison.overallScore')}
                  </th>
                  {visibleData.map((d) => (
                    <td key={d.candidateId} className="p-2 text-center">
                      {d.error ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <ScoreRing score={d.aggregate?.overallAverage ?? null} size="default" />
                          <span className="font-semibold">{d.aggregate?.overallAverage?.toFixed(1) ?? '–'}</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Days in pipeline */}
                <tr className="border-t">
                  <th scope="row" className="sticky left-0 bg-background z-10 p-2 text-left font-medium text-muted-foreground">
                    {t('comparison.daysInPipeline')}
                  </th>
                  {visibleData.map((d) => (
                    <td key={d.candidateId} className="p-2 text-center">
                      {daysInStage(d.candidate.updatedAt)}d
                    </td>
                  ))}
                </tr>

                {/* Source */}
                <tr className="border-t">
                  <th scope="row" className="sticky left-0 bg-background z-10 p-2 text-left font-medium text-muted-foreground">
                    {t('comparison.source')}
                  </th>
                  {visibleData.map((d) => (
                    <td key={d.candidateId} className="p-2 text-center text-xs">
                      {t(`candidate.source_${d.candidate.source.toLowerCase()}` as any)}
                    </td>
                  ))}
                </tr>

                {/* Criterion rows */}
                {allCriteria.map((criterion) => (
                  <tr key={criterion.id} className="border-t">
                    <th scope="row" className="sticky left-0 bg-background z-10 p-2 text-left font-medium">
                      {criterion.name}
                    </th>
                    {visibleData.map((d) => {
                      const cd = d.aggregate?.criteria.find((c) => c.criterionId === criterion.id)
                      const avg = cd?.average ?? null
                      const key = `${d.candidateId}:${criterion.id}`
                      const hl = highlights[key]
                      const cellClass = hl?.isHighest
                        ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                        : ''
                      return (
                        <td key={d.candidateId} className={`p-2 text-center ${cellClass}`}>
                          <div className="flex items-center justify-center gap-1">
                            {avg !== null ? (
                              <span className="font-medium">{avg.toFixed(1)}</span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                            {hl?.hasGap && avg !== null && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400" aria-label={t('comparison.significantDifference')}>
                                ⚠
                              </span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            {t('comparison.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
