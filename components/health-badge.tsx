'use client'

import { useTranslations } from 'next-intl'
import type { StarterHealthScore } from '@/app/api/stats/health/route'

const levelConfig = {
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
    border: 'border-green-300 dark:border-green-700',
  },
  orange: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-300 dark:border-amber-700',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
    border: 'border-red-300 dark:border-red-700',
  },
}

export function HealthDot({ level, size = 'sm' }: { level: 'green' | 'orange' | 'red'; size?: 'sm' | 'md' }) {
  const t = useTranslations('health')
  const config = levelConfig[level]
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'

  return (
    <span
      className={`inline-block rounded-full ${sizeClass} ${config.dot} shrink-0`}
      title={t(level)}
    />
  )
}

export function HealthBadge({ score }: { score: StarterHealthScore }) {
  const t = useTranslations('health')
  const config = levelConfig[score.level]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}
      title={`${t('tasks')}: ${score.tasks.completed}/${score.tasks.total} | ${t('materials')}: ${score.materials.provided}/${score.materials.total}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
      {score.overall}%
    </span>
  )
}

export function HealthProgressBar({ score }: { score: StarterHealthScore }) {
  const t = useTranslations('health')

  const categories = [
    { label: t('tasks'), value: score.taskScore, detail: `${score.tasks.completed}/${score.tasks.total}${score.tasks.overdue > 0 ? ` (${score.tasks.overdue} ${t('overdue')})` : ''}` },
    { label: t('materials'), value: score.materialScore, detail: `${score.materials.provided}/${score.materials.total}` },
    { label: t('timeline'), value: score.timelineScore, detail: score.daysUntilStart !== null ? (score.daysUntilStart > 0 ? `${score.daysUntilStart} ${t('daysLeft')}` : t('started')) : '-' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('overallHealth')}</span>
        <HealthBadge score={score} />
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            score.level === 'green' ? 'bg-green-500' : score.level === 'orange' ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(100, score.overall)}%` }}
        />
      </div>

      <div className="grid gap-2">
        {categories.map(cat => (
          <div key={cat.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{cat.label}</span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  cat.value >= 80 ? 'bg-green-500' : cat.value >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, cat.value)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{cat.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
