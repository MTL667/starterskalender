'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface ScoreRingProps {
  score: number | null
  size?: 'sm' | 'default' | 'lg'
}

const sizeMap = {
  sm: 'h-6 w-6 text-[10px]',
  default: 'h-7 w-7 text-xs',
  lg: 'h-9 w-9 text-sm',
} as const

export function ScoreRing({ score, size = 'default' }: ScoreRingProps) {
  const t = useTranslations('recruitment')

  if (score === null || score === undefined) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full border-2 border-dashed border-muted font-medium text-muted-foreground',
          sizeMap[size]
        )}
        aria-label={t('card.noScore')}
      >
        –
      </div>
    )
  }

  const colorClass =
    score >= 4.0
      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
      : score >= 3.0
        ? 'border-amber-500 text-amber-600 dark:text-amber-400'
        : 'border-destructive text-destructive'

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-medium',
        colorClass,
        sizeMap[size]
      )}
      aria-label={t('card.scoreAriaLabel', { score: score.toFixed(1) })}
    >
      {score.toFixed(1)}
    </div>
  )
}
