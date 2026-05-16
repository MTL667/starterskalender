'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  KeyboardCode,
  TouchSensor,
  useSensors,
  useSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from '@dnd-kit/core'
import { LayoutGroup } from 'framer-motion'
import { useSSE, useSSEStatus } from '@/components/providers/sse-provider'
import { StageColumn } from './stage-column'
import { PipelineFilterBar, type PipelineFilters } from './pipeline-filter-bar'
import { CandidateCard, daysInStage, type PipelineCandidateItem } from './candidate-card'
import { CandidateMoveDialog } from './candidate-move-dialog'
import { HireConfirmationDialog, type HireDetails } from './hire-confirmation-dialog'
import { CandidateDetailDialog } from './candidate-detail-dialog'
import { CandidateComparisonDialog } from './candidate-comparison-dialog'
import { canMoveToStage } from '@/lib/recruitment/pipeline-rules'
import { PIPELINE_EVENTS } from '@/lib/recruitment/pipeline-events'
import type { SSEEvent } from '@/lib/events'

class SpaceOnlyKeyboardSensor extends KeyboardSensor {
  static activators = [
    {
      eventName: 'onKeyDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: KeyboardEvent }) => {
        return nativeEvent.code === KeyboardCode.Space
      },
    },
  ]
}

interface Stage {
  id: string
  name: string
  order: number
  isTerminal: boolean
  triggersEmail?: boolean
}

interface PipelineKanbanProps {
  vacancyId: string
  stages: Stage[]
  canWrite: boolean
  entityName: string
  vacancyTitle?: string
  onAddCandidate: () => void
}

interface PendingMove {
  candidateId: string
  candidateName: string
  fromStageId: string
  toStageId: string
  toStageName: string
  isTerminal: boolean
  triggersEmail: boolean
}

function isHireStage(name: string) {
  const lower = name.toLowerCase()
  return lower.includes('hired') || lower.includes('aangenomen')
}

export function PipelineKanban({ vacancyId, stages, canWrite, entityName, vacancyTitle = '', onAddCandidate }: PipelineKanbanProps) {
  const t = useTranslations('recruitment')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [candidates, setCandidates] = useState<PipelineCandidateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [filters, setFilters] = useState<PipelineFilters>({
    source: 'ALL',
    daysMin: '',
    daysMax: '',
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overStageId, setOverStageId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [pendingHire, setPendingHire] = useState<PendingMove | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const [detailCandidate, setDetailCandidate] = useState<PipelineCandidateItem | null>(null)
  const detailOpenerRef = useRef<string | null>(null)
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set())
  const [compareOpen, setCompareOpen] = useState(false)

  const openCandidateDetail = useCallback(
    (candidateId: string, opener?: string) => {
      const c = candidates.find((x) => x.id === candidateId)
      if (!c) return
      if (opener) detailOpenerRef.current = opener
      setDetailCandidate(c)
      const params = new URLSearchParams(searchParams.toString())
      params.set('candidate', candidateId)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [candidates, searchParams, router, pathname]
  )

  const closeCandidateDetail = useCallback(() => {
    setDetailCandidate(null)
    lastHandledParam.current = null
    const params = new URLSearchParams(searchParams.toString())
    params.delete('candidate')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    if (detailOpenerRef.current) {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-candidate-id="${CSS.escape(detailOpenerRef.current!)}"]`) as HTMLElement | null
        el?.focus()
        detailOpenerRef.current = null
      })
    }
  }, [searchParams, router, pathname])

  const lastHandledParam = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return
    const candidateParam = searchParams.get('candidate')

    if (!candidateParam) {
      lastHandledParam.current = null
      return
    }

    if (candidateParam === lastHandledParam.current) return
    lastHandledParam.current = candidateParam

    const c = candidates.find((x) => x.id === candidateParam)
    if (c) {
      setDetailCandidate(c)
    } else {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('candidate')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [candidates, loading, searchParams, router, pathname])

  const toggleCompareSelection = useCallback((candidateId: string) => {
    setCompareSelection((prev) => {
      const next = new Set(prev)
      if (next.has(candidateId)) {
        next.delete(candidateId)
      } else if (next.size < 4) {
        next.add(candidateId)
      }
      return next
    })
  }, [])

  const openComparison = useCallback(() => {
    if (compareSelection.size >= 2) setCompareOpen(true)
  }, [compareSelection])

  const closeComparison = useCallback(() => {
    setCompareOpen(false)
    setCompareSelection(new Set())
  }, [])

  const handleCardClick = useCallback(
    (candidateId: string) => {
      openCandidateDetail(candidateId, candidateId)
    },
    [openCandidateDetail]
  )

  const [focusedColumnIndex, setFocusedColumnIndex] = useState(0)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const columnHeaderRefs = useRef<(HTMLHeadingElement | null)[]>([])

  const moveErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const queuedEvents = useRef<SSEEvent[]>([])
  const activeIdRef = useRef<string | null>(null)

  const sseStatus = useSSEStatus()
  const prevStatusRef = useRef(sseStatus)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    return () => {
      if (moveErrorTimer.current) clearTimeout(moveErrorTimer.current)
      for (const timer of highlightTimers.current.values()) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const prev = prevStatusRef.current
    if (prev !== 'connected' && sseStatus === 'connected') {
      fetchCandidates()
    }
    prevStatusRef.current = sseStatus
  }, [sseStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(SpaceOnlyKeyboardSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const fetchCandidates = useCallback(async () => {
    try {
      setFetchError(false)
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}/candidates`)
      if (res.ok) {
        let result: any
        try {
          result = await res.json()
        } catch {
          setFetchError(true)
          return
        }
        setCandidates(Array.isArray(result.data) ? result.data : [])
      } else {
        setFetchError(true)
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [vacancyId])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  function addHighlight(candidateId: string) {
    setHighlightedIds((prev) => new Set(prev).add(candidateId))
    const existing = highlightTimers.current.get(candidateId)
    if (existing) clearTimeout(existing)
    highlightTimers.current.set(
      candidateId,
      setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev)
          next.delete(candidateId)
          return next
        })
        highlightTimers.current.delete(candidateId)
      }, 2000)
    )
  }

  function processSSEEvent(event: SSEEvent) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload || payload.vacancyId !== vacancyId) return

    if (event.type === PIPELINE_EVENTS.CANDIDATE_MOVED) {
      const { candidateId, toStageId, timestamp } = payload as {
        candidateId: string; toStageId: string; timestamp: string
      }
      const targetStage = stageMap[toStageId]
      if (!targetStage) return

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? { ...c, stage: { id: targetStage.id, name: targetStage.name, order: targetStage.order }, updatedAt: timestamp }
            : c
        )
      )
      addHighlight(candidateId)
    } else if (event.type === PIPELINE_EVENTS.CANDIDATE_ADDED) {
      const { candidateId } = payload as { candidateId: string }
      addHighlight(candidateId)
      fetchCandidates()
    }
  }

  useSSE('recruitment:pipeline:*', (event) => {
    if (activeIdRef.current) {
      queuedEvents.current.push(event)
      return
    }
    processSSEEvent(event)
  })

  function flushQueuedEvents() {
    const events = [...queuedEvents.current]
    queuedEvents.current = []
    for (const e of events) {
      try { processSSEEvent(e) } catch { /* skip malformed queued event */ }
    }
  }

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (filters.source !== 'ALL' && c.source !== filters.source) return false
      const days = daysInStage(c.updatedAt)
      if (filters.daysMin && days < parseInt(filters.daysMin, 10)) return false
      if (filters.daysMax && days > parseInt(filters.daysMax, 10)) return false
      return true
    })
  }, [candidates, filters])

  const candidatesByStage = useMemo(() => {
    const map: Record<string, PipelineCandidateItem[]> = {}
    for (const stage of stages) {
      map[stage.id] = []
    }
    for (const c of filteredCandidates) {
      if (map[c.stage.id]) {
        map[c.stage.id].push(c)
      }
    }
    return map
  }, [filteredCandidates, stages])

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order),
    [stages]
  )

  const stageMap = useMemo(() => {
    const map: Record<string, Stage> = {}
    for (const s of stages) map[s.id] = s
    return map
  }, [stages])

  const activeCandidate = useMemo(
    () => (activeId ? candidates.find((c) => c.id === activeId) ?? null : null),
    [activeId, candidates]
  )

  // --- Focus management ---

  const handleColumnKeyDown = useCallback(
    (e: React.KeyboardEvent, _stageId: string) => {
      const colIdx = sortedStages.findIndex((s) => s.id === _stageId)
      if (colIdx === -1) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const next = Math.min(colIdx + 1, sortedStages.length - 1)
        setFocusedColumnIndex(next)
        setFocusedCardId(null)
        columnHeaderRefs.current[next]?.focus()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prev = Math.max(colIdx - 1, 0)
        setFocusedColumnIndex(prev)
        setFocusedCardId(null)
        columnHeaderRefs.current[prev]?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const stageId = sortedStages[colIdx].id
        const cards = candidatesByStage[stageId] ?? []
        if (cards.length > 0) {
          setFocusedCardId(cards[0].id)
        }
      }
    },
    [sortedStages, candidatesByStage]
  )

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, candidateId: string, stageId: string) => {
      const cards = candidatesByStage[stageId] ?? []
      const cardIdx = cards.findIndex((c) => c.id === candidateId)
      if (cardIdx === -1) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (cardIdx < cards.length - 1) {
          setFocusedCardId(cards[cardIdx + 1].id)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (cardIdx > 0) {
          setFocusedCardId(cards[cardIdx - 1].id)
        } else {
          setFocusedCardId(null)
          const colIdx = sortedStages.findIndex((s) => s.id === stageId)
          if (colIdx !== -1) {
            setFocusedColumnIndex(colIdx)
            columnHeaderRefs.current[colIdx]?.focus()
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        openCandidateDetail(candidateId, candidateId)
      }
    },
    [candidatesByStage, sortedStages, openCandidateDetail]
  )

  useEffect(() => {
    if (!focusedCardId) return
    const stage = sortedStages[focusedColumnIndex]
    if (!stage) return
    const cards = candidatesByStage[stage.id] ?? []
    if (!cards.some((c) => c.id === focusedCardId)) {
      setFocusedCardId(null)
      columnHeaderRefs.current[focusedColumnIndex]?.focus()
      return
    }
    const el = document.querySelector(`[data-candidate-id="${CSS.escape(focusedCardId)}"]`) as HTMLElement | null
    el?.focus()
  }, [focusedCardId, candidatesByStage, sortedStages, focusedColumnIndex])

  // --- Drag handlers ---

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    setActiveId(id)
    activeIdRef.current = id
  }

  function handleDragOver(event: any) {
    const overId = event.over?.id as string | undefined
    if (overId && stageMap[overId]) {
      setOverStageId(overId)
    } else {
      setOverStageId(null)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setOverStageId(null)
    activeIdRef.current = null

    flushQueuedEvents()

    if (!over) return

    const candidateId = active.id as string
    const toStageId = over.id as string
    const candidate = candidates.find((c) => c.id === candidateId)
    if (!candidate) return

    const currentStage = stageMap[candidate.stage.id]
    const targetStage = stageMap[toStageId]
    if (!currentStage || !targetStage) return
    if (currentStage.id === targetStage.id) return

    if (!canMoveToStage(currentStage, targetStage)) return

    if (targetStage.isTerminal) {
      const moveData: PendingMove = {
        candidateId,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        fromStageId: currentStage.id,
        toStageId: targetStage.id,
        toStageName: targetStage.name,
        isTerminal: true,
        triggersEmail: targetStage.triggersEmail ?? false,
      }

      if (isHireStage(targetStage.name)) {
        setPendingHire(moveData)
      } else {
        setPendingMove(moveData)
      }
      return
    }

    await executeMove(candidateId, currentStage, targetStage)
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null)
    setOverStageId(null)
    activeIdRef.current = null
    flushQueuedEvents()
  }

  async function executeMove(
    candidateId: string,
    fromStage: Stage,
    toStage: Stage,
    emailOptions?: { sendEmail: boolean; rejectionReason?: string }
  ) {
    const candidate = candidates.find((c) => c.id === candidateId)
    if (!candidate) return

    const originalStage = candidate.stage
    const originalUpdatedAt = candidate.updatedAt

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, stage: { id: toStage.id, name: toStage.name, order: toStage.order }, updatedAt: new Date().toISOString() }
          : c
      )
    )

    try {
      const res = await fetch(`/api/recruitment/candidates/${candidateId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStageId: toStage.id,
          sendEmail: emailOptions?.sendEmail ?? false,
          rejectionReason: emailOptions?.rejectionReason,
        }),
      })

      if (res.ok) {
        setMoveError(null)
      } else {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId
              ? { ...c, stage: originalStage, updatedAt: originalUpdatedAt }
              : c
          )
        )
        showMoveError()
      }
    } catch {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? { ...c, stage: originalStage, updatedAt: originalUpdatedAt }
            : c
        )
      )
      showMoveError()
    }
  }

  function showMoveError() {
    setMoveError(t('pipeline.moveError'))
    if (moveErrorTimer.current) clearTimeout(moveErrorTimer.current)
    moveErrorTimer.current = setTimeout(() => setMoveError(null), 5000)
  }

  async function handleConfirmMove(options: { sendEmail: boolean; rejectionReason?: string }) {
    if (!pendingMove) return
    const fromStage = stageMap[pendingMove.fromStageId]
    const toStage = stageMap[pendingMove.toStageId]
    if (!fromStage || !toStage) return
    setPendingMove(null)
    await executeMove(pendingMove.candidateId, fromStage, toStage, options)
  }

  function handleCancelMove() {
    setPendingMove(null)
  }

  async function handleConfirmHire(details: HireDetails) {
    if (!pendingHire) return
    const toStage = stageMap[pendingHire.toStageId]
    const fromStage = stageMap[pendingHire.fromStageId]
    if (!fromStage || !toStage) return

    const candidate = candidates.find(c => c.id === pendingHire.candidateId)
    if (!candidate) return

    const originalStage = candidate.stage
    const originalUpdatedAt = candidate.updatedAt

    setCandidates(prev =>
      prev.map(c =>
        c.id === pendingHire.candidateId
          ? { ...c, stage: { id: toStage.id, name: toStage.name, order: toStage.order }, updatedAt: new Date().toISOString() }
          : c
      )
    )
    setPendingHire(null)

    try {
      const res = await fetch(`/api/recruitment/candidates/${pendingHire.candidateId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStageId: toStage.id,
          startDate: details.startDate || undefined,
          contractType: details.contractType || undefined,
          roleTitle: details.roleTitle || undefined,
          sendEmail: details.sendEmail,
        }),
      })

      if (!res.ok) {
        setCandidates(prev =>
          prev.map(c =>
            c.id === pendingHire!.candidateId
              ? { ...c, stage: originalStage, updatedAt: originalUpdatedAt }
              : c
          )
        )
        showMoveError()
      }
    } catch {
      setCandidates(prev =>
        prev.map(c =>
          c.id === pendingHire!.candidateId
            ? { ...c, stage: originalStage, updatedAt: originalUpdatedAt }
            : c
        )
      )
      showMoveError()
    }
  }

  function handleCancelHire() {
    setPendingHire(null)
  }

  function isValidDrop(stageId: string): boolean {
    if (!activeCandidate) return false
    const currentStage = stageMap[activeCandidate.stage.id]
    const targetStage = stageMap[stageId]
    if (!currentStage || !targetStage) return false
    if (currentStage.id === targetStage.id) return false
    return canMoveToStage(currentStage, targetStage)
  }

  const announcements = {
    onDragStart({ active }: DragStartEvent) {
      const c = candidates.find((x) => x.id === active.id)
      if (!c) return ''
      return `${t('pipeline.grabbed', { name: `${c.firstName} ${c.lastName}` })}. ${t('pipeline.cardGrabInstructions')}`
    },
    onDragOver({ over }: any) {
      if (!over) return ''
      const stage = stageMap[over.id as string]
      return stage ? t('pipeline.overStage', { stage: stage.name }) : ''
    },
    onDragEnd({ active, over }: DragEndEvent) {
      const c = candidates.find((x) => x.id === active.id)
      const name = c ? `${c.firstName} ${c.lastName}` : ''
      if (!over) return t('pipeline.dragCancelled')
      const stage = stageMap[over.id as string]
      return stage ? t('pipeline.dropped', { name, stage: stage.name }) : t('pipeline.dragCancelled')
    },
    onDragCancel({ active }: DragCancelEvent) {
      return t('pipeline.dragCancelled')
    },
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {sortedStages.map((stage) => (
            <div key={stage.id} className="w-72 shrink-0 rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-20 bg-muted rounded animate-pulse" />
              <div className="h-20 bg-muted rounded animate-pulse" />
              <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">{t('pipeline.loadError')}</p>
      </div>
    )
  }

  const hasActiveFilters = filters.source !== 'ALL' || filters.daysMin !== '' || filters.daysMax !== ''
  const filtersHideAll = hasActiveFilters && candidates.length > 0 && filteredCandidates.length === 0

  return (
    <div className="space-y-2">
      <PipelineFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        compareCount={compareSelection.size}
        onCompare={openComparison}
      />

      {sseStatus === 'reconnecting' && (
        <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
          {t('pipeline.reconnecting')}
        </div>
      )}

      {filtersHideAll && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('pipeline.noFilterResults')}
        </p>
      )}

      {moveError && (
        <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {moveError}
        </div>
      )}

      <DndContext
        sensors={canWrite ? sensors : undefined}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{ announcements }}
      >
        <LayoutGroup>
          <div id="pipeline-board" className="flex gap-3 overflow-x-auto pb-4" role="group" aria-label={t('pipeline.sectionTitle')}>
            {sortedStages.map((stage, index) => (
              <StageColumn
                key={stage.id}
                stageId={stage.id}
                stageName={stage.name}
                candidates={candidatesByStage[stage.id] ?? []}
                isFirstColumn={index === 0}
                totalCandidates={candidates.length}
                entityName={entityName}
                canWrite={canWrite}
                isDragOver={overStageId === stage.id && isValidDrop(stage.id)}
                isInvalidDrop={overStageId === stage.id && !isValidDrop(stage.id)}
                activeId={activeId}
                highlightedIds={highlightedIds}
                isFocusedColumn={focusedColumnIndex === index && focusedCardId === null}
                focusedCardId={focusedColumnIndex === index ? focusedCardId : null}
                firstCardFocusable={focusedColumnIndex === index && focusedCardId === null}
                onColumnKeyDown={handleColumnKeyDown}
                onCardKeyDown={handleCardKeyDown}
                onCardClick={handleCardClick}
                columnHeaderRef={(el) => { columnHeaderRefs.current[index] = el }}
                onAddCandidate={canWrite ? onAddCandidate : undefined}
                compareSelection={compareSelection}
                onSelectionToggle={toggleCompareSelection}
              />
            ))}
          </div>
        </LayoutGroup>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeCandidate ? (
            <div className="rotate-2 scale-105 shadow-lg">
              <CandidateCard candidate={activeCandidate} entityName={entityName} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CandidateMoveDialog
        open={!!pendingMove}
        candidateName={pendingMove?.candidateName ?? ''}
        stageName={pendingMove?.toStageName ?? ''}
        triggersEmail={pendingMove?.triggersEmail ?? false}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />

      <HireConfirmationDialog
        open={!!pendingHire}
        candidateName={pendingHire?.candidateName ?? ''}
        entityName={entityName}
        vacancyTitle={vacancyTitle}
        onConfirm={handleConfirmHire}
        onCancel={handleCancelHire}
      />

      <CandidateDetailDialog
        candidate={detailCandidate}
        entityName={entityName}
        onClose={closeCandidateDetail}
      />

      <CandidateComparisonDialog
        open={compareOpen}
        candidates={candidates.filter((c) => compareSelection.has(c.id))}
        onClose={closeComparison}
      />
    </div>
  )
}
