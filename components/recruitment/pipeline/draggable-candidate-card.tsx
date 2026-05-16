'use client'

import { useRef, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { CandidateCard, type PipelineCandidateItem } from './candidate-card'
import { cn } from '@/lib/utils'

interface DraggableCandidateCardProps {
  candidate: PipelineCandidateItem
  entityName: string
  canDrag: boolean
  isDragging: boolean
  isHighlighted?: boolean
  isAnyDragging: boolean
  isFocused: boolean
  isSelected?: boolean
  onSelectionToggle?: (id: string) => void
  onCardKeyDown?: (e: React.KeyboardEvent, candidateId: string) => void
  onCardClick?: (candidateId: string) => void
}

export function DraggableCandidateCard({
  candidate,
  entityName,
  canDrag,
  isDragging,
  isHighlighted,
  isAnyDragging,
  isFocused,
  isSelected,
  onSelectionToggle,
  onCardKeyDown,
  onCardClick,
}: DraggableCandidateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: candidate.id,
    data: { name: `${candidate.firstName} ${candidate.lastName}` },
    disabled: !canDrag,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        onCardKeyDown?.(e, candidate.id)
        return
      }
      // Let dnd-kit listeners handle Space for drag activation
      const dndKeyDown = listeners?.onKeyDown as ((e: React.KeyboardEvent) => void) | undefined
      dndKeyDown?.(e)
    },
    [candidate.id, onCardKeyDown, listeners]
  )

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      ;(cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [setNodeRef]
  )

  const handleClick = useCallback(() => {
    if (!isDragging && !isAnyDragging) {
      onCardClick?.(candidate.id)
    }
  }, [isDragging, isAnyDragging, onCardClick, candidate.id])

  const { onKeyDown: _dndKeyDown, ...restListeners } = listeners ?? {}
  const { role: _role, tabIndex: _tabIndex, ...restAttributes } = attributes

  return (
    <motion.div
      layoutId={candidate.id}
      layout={!isAnyDragging}
      initial={isHighlighted ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        layout: { duration: 0.3, ease: 'easeInOut' },
        opacity: { duration: 0.25 },
        y: { duration: 0.25 },
      }}
    >
      <div
        ref={mergedRef}
        style={style}
        role="option"
        tabIndex={isFocused ? 0 : -1}
        aria-selected={isDragging}
        data-candidate-id={candidate.id}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        className={cn(
          'motion-safe:transition-all outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isDragging && 'opacity-30',
          canDrag && 'cursor-grab active:cursor-grabbing',
          isHighlighted && 'motion-safe:animate-sse-highlight'
        )}
        {...restListeners}
        {...restAttributes}
      >
        <CandidateCard ref={cardRef} candidate={candidate} entityName={entityName} isSelected={isSelected} onSelectionToggle={onSelectionToggle} />
      </div>
    </motion.div>
  )
}
