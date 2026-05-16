'use client'

import { forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Users, Share2, MessageSquare, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DaysCounter } from './days-counter'
import { ScoreRing } from './score-ring'

export interface PipelineCandidateItem {
  id: string
  firstName: string
  lastName: string
  email: string
  source: string
  dealbreakersResult: 'PASS' | 'FAIL' | 'PENDING'
  niceToHaveScore: number | null
  evaluationAggregateScore?: number | null
  evaluationReviewCount?: number
  stage: { id: string; name: string; order: number }
  updatedAt: string
  createdAt: string
}

interface CandidateCardProps {
  candidate: PipelineCandidateItem
  entityName: string
  isSelected?: boolean
  onSelectionToggle?: (id: string) => void
}

export function daysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
}

function isNewCandidate(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 86400000
}

export const CandidateCard = forwardRef<HTMLDivElement, CandidateCardProps>(
  function CandidateCard({ candidate, entityName, isSelected, onSelectionToggle }, ref) {
    const t = useTranslations('recruitment')
    const days = daysInStage(candidate.updatedAt)
    const isNew = isNewCandidate(candidate.createdAt)
    const isFail = candidate.dealbreakersResult === 'FAIL'
    const isPass = candidate.dealbreakersResult === 'PASS'
    const isRejected = candidate.stage.name.toLowerCase().includes('reject') || candidate.stage.name.toLowerCase().includes('afgewezen')

    const sourceKey = `candidate.source_${candidate.source.toLowerCase()}`
    const fullName = `${candidate.firstName} ${candidate.lastName}`

    const displayScore = candidate.evaluationAggregateScore ?? candidate.niceToHaveScore
    const hasScore = displayScore !== null && displayScore !== undefined
    const reviewCount = candidate.evaluationReviewCount ?? 0

    const scoreAriaSegment = hasScore
      ? `${t('card.scorePrefix')} ${displayScore!.toFixed(1)}`
      : t('card.noScore')

    const ariaLabel = `${fullName}, ${entityName}, ${scoreAriaSegment}, ${days} ${t('card.daysAriaLabel')}`

    return (
      <div
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          'group relative rounded-lg border bg-card p-3 shadow-sm',
          'motion-safe:transition-shadow hover:shadow-md',
          isNew && 'border-l-2 border-l-blue-400',
          isFail && 'opacity-50',
          isRejected && 'opacity-60 grayscale-[30%]'
        )}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {onSelectionToggle && (
              <input
                type="checkbox"
                checked={isSelected ?? false}
                onChange={(e) => {
                  e.stopPropagation()
                  onSelectionToggle(candidate.id)
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 shrink-0 rounded border-muted-foreground/40 accent-primary"
                aria-label={t('comparison.checkboxLabel')}
              />
            )}
            <p className="text-sm font-medium truncate">{fullName}</p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 leading-tight">
            {entityName}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          <DaysCounter days={days} />
          <span className="text-muted-foreground text-xs">·</span>
          <Badge variant="outline" className="text-xs">
            {t(sourceKey as any)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
          {isFail && (
            <span className="inline-flex items-center gap-0.5 text-xs text-destructive">
              <X className="h-3 w-3" />
              {t('card.dealbreaker')}
            </span>
          )}
          {isPass && (
            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-400">
              <Check className="h-3 w-3" />
              {t('card.dealbreaker')}
            </span>
          )}

          <ScoreRing score={displayScore} size="sm" />

          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground ml-auto">
            <Users className="h-3 w-3" />
            {reviewCount}
          </span>
        </div>

        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 min-w-[44px] min-h-[44px] -m-2"
            aria-label={t('card.actionShare')}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 min-w-[44px] min-h-[44px] -m-2"
            aria-label={t('card.actionComment')}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 min-w-[44px] min-h-[44px] -m-2"
            aria-label={t('card.actionOpen')}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }
)
