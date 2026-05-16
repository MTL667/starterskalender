'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface FunnelStage {
  id: string
  name: string
  order: number
  count: number
  dropOff: number
  avgDaysInStage: number | null
}

interface FunnelChartProps {
  vacancyId: string
}

export function FunnelChart({ vacancyId }: FunnelChartProps) {
  const t = useTranslations('recruitment.funnel')
  const [stages, setStages] = useState<FunnelStage[]>([])
  const [maxCount, setMaxCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [includeClosed, setIncludeClosed] = useState(false)
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = includeClosed ? '?includeClosed=true' : ''
    fetch(`/api/recruitment/vacancies/${vacancyId}/funnel${params}`)
      .then(r => r.json())
      .then(({ data }) => {
        setStages(data.stages)
        setMaxCount(data.maxCount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [vacancyId, includeClosed])

  if (loading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}</div>
  }

  if (stages.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('empty')}</p>
  }

  const firstCount = stages[0]?.count || 1

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch id="include-closed" checked={includeClosed} onCheckedChange={setIncludeClosed} />
        <Label htmlFor="include-closed" className="text-sm">{t('includeClosed')}</Label>
      </div>

      <div className="space-y-1.5">
        {stages.map(stage => {
          const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 4) : 4
          const pctOfFirst = firstCount > 0 ? Math.round((stage.count / firstCount) * 100) : 0
          const isHovered = hoveredStage === stage.id

          return (
            <div
              key={stage.id}
              className="relative"
              onMouseEnter={() => setHoveredStage(stage.id)}
              onMouseLeave={() => setHoveredStage(null)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 truncate shrink-0">{stage.name}</span>
                <div className="flex-1 relative h-8">
                  <div
                    className="h-full rounded bg-primary/20 transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  >
                    <div className="absolute inset-y-0 left-0 flex items-center px-2">
                      <span className="text-xs font-medium">{stage.count}</span>
                      <span className="text-xs text-muted-foreground ml-1">({pctOfFirst}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {isHovered && (
                <div className="absolute z-10 left-32 -top-1 bg-popover border rounded-md shadow-md p-2 text-xs space-y-0.5 min-w-[180px]">
                  <p className="font-medium">{stage.name}</p>
                  <p>{t('count')}: {stage.count}</p>
                  {stage.dropOff > 0 && <p className="text-destructive">{t('dropOff')}: -{stage.dropOff}%</p>}
                  {stage.avgDaysInStage !== null && <p>{t('avgDays')}: {stage.avgDaysInStage}d</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
