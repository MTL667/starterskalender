'use client'

import { useTranslations } from 'next-intl'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DaysCounterProps {
  days: number
  warningThreshold?: number
  exceededThreshold?: number
}

export function DaysCounter({
  days,
  warningThreshold = 8,
  exceededThreshold = 14,
}: DaysCounterProps) {
  const t = useTranslations('recruitment')

  const colorClass =
    days > exceededThreshold
      ? 'text-destructive'
      : days >= warningThreshold
        ? 'text-amber-600 dark:text-amber-500'
        : 'text-muted-foreground'

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-xs', colorClass)}
      aria-label={`${days} ${t('card.daysAriaLabel')}`}
    >
      <Clock className="h-3 w-3" />
      {days}
      {t('pipeline.daysShort')}
    </span>
  )
}
