'use client'

import { useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useDroppable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { DraggableCandidateCard } from './draggable-candidate-card'
import { type PipelineCandidateItem } from './candidate-card'
import { cn } from '@/lib/utils'

interface StageColumnProps {
  stageId: string
  stageName: string
  candidates: PipelineCandidateItem[]
  isFirstColumn: boolean
  totalCandidates: number
  entityName: string
  canWrite: boolean
  isDragOver: boolean
  isInvalidDrop: boolean
  activeId: string | null
  highlightedIds: Set<string>
  isFocusedColumn: boolean
  focusedCardId: string | null
  onColumnKeyDown: (e: React.KeyboardEvent, stageId: string) => void
  onCardKeyDown: (e: React.KeyboardEvent, candidateId: string, stageId: string) => void
  onCardClick: (candidateId: string) => void
  columnHeaderRef: (el: HTMLHeadingElement | null) => void
  firstCardFocusable: boolean
  onAddCandidate?: () => void
  compareSelection?: Set<string>
  onSelectionToggle?: (id: string) => void
}

export function StageColumn({
  stageId,
  stageName,
  candidates,
  isFirstColumn,
  totalCandidates,
  entityName,
  canWrite,
  isDragOver,
  isInvalidDrop,
  activeId,
  highlightedIds,
  isFocusedColumn,
  focusedCardId,
  onColumnKeyDown,
  onCardKeyDown,
  onCardClick,
  columnHeaderRef,
  firstCardFocusable,
  onAddCandidate,
  compareSelection,
  onSelectionToggle,
}: StageColumnProps) {
  const t = useTranslations('recruitment')
  const { setNodeRef } = useDroppable({
    id: stageId,
    data: { stageName },
  })

  const handleHeaderKeyDown = useCallback(
    (e: React.KeyboardEvent) => onColumnKeyDown(e, stageId),
    [onColumnKeyDown, stageId]
  )

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, candidateId: string) => onCardKeyDown(e, candidateId, stageId),
    [onCardKeyDown, stageId]
  )

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={t('pipeline.columnLabel', { stage: stageName, count: candidates.length })}
      className={cn(
        'flex flex-col w-72 shrink-0 rounded-lg border bg-muted/30 motion-safe:transition-all motion-safe:duration-200',
        isDragOver && 'ring-2 ring-primary/50 border-primary/50 motion-safe:animate-pulse',
        isInvalidDrop && 'opacity-50',
        activeId && !isDragOver && !isInvalidDrop && 'opacity-75'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <h3
          ref={columnHeaderRef}
          tabIndex={isFocusedColumn ? 0 : -1}
          onKeyDown={handleHeaderKeyDown}
          className="text-sm font-semibold truncate outline-none rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {stageName}
        </h3>
        <Badge variant="secondary" className="text-xs ml-2">
          {candidates.length}
        </Badge>
      </div>

      <div role="listbox" aria-label={stageName} className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)]">
        {candidates.length === 0 && isFirstColumn && totalCandidates === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {t('pipeline.emptyState')}
            </p>
            {onAddCandidate && (
              <Button variant="outline" size="sm" onClick={onAddCandidate}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                {t('candidate.addButton')}
              </Button>
            )}
          </div>
        ) : (
          candidates.map((candidate) => (
            <DraggableCandidateCard
              key={candidate.id}
              candidate={candidate}
              entityName={entityName}
              canDrag={canWrite}
              isDragging={activeId === candidate.id}
              isHighlighted={highlightedIds.has(candidate.id)}
              isAnyDragging={!!activeId}
              isFocused={focusedCardId === candidate.id || (firstCardFocusable && !focusedCardId && candidates.indexOf(candidate) === 0)}
              isSelected={compareSelection?.has(candidate.id)}
              onSelectionToggle={onSelectionToggle}
              onCardKeyDown={handleCardKeyDown}
              onCardClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
