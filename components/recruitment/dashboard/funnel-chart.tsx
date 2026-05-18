'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { TrendingDown } from 'lucide-react'

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
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-24 h-4 bg-muted rounded animate-pulse" />
            <div className="flex-1 h-10 bg-muted rounded animate-pulse" style={{ width: `${100 - i * 15}%` }} />
          </div>
        ))}
      </div>
    )
  }

  if (stages.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{t('empty')}</p>
  }

  const firstCount = stages[0]?.count || 1

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Switch id="include-closed" checked={includeClosed} onCheckedChange={setIncludeClosed} />
        <Label htmlFor="include-closed" className="text-sm cursor-pointer">{t('includeClosed')}</Label>
      </div>

      <div className="space-y-2">
        {stages.map((stage, index) => {
          const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8
          const pctOfFirst = firstCount > 0 ? Math.round((stage.count / firstCount) * 100) : 0
          const showDropOff = index > 0 && stage.dropOff > 0

          return (
            <div key={stage.id} className="group">
              {showDropOff && (
                <div className="flex items-center gap-2 pl-28 py-0.5">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-xs text-destructive font-medium">-{stage.dropOff}%</span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-24 truncate shrink-0 text-right font-medium">
                  {stage.name}
                </span>
                <div className="flex-1 relative">
                  <div
                    className="h-10 rounded-md bg-primary/15 group-hover:bg-primary/25 transition-colors relative overflow-hidden"
                    style={{ width: `${widthPct}%` }}
                  >
                    <div
                      className="absolute inset-0 bg-primary/20 rounded-md"
                      style={{ width: `${Math.min(pctOfFirst, 100)}%` }}
                    />
                  </div>
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="text-sm font-semibold">{stage.count}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">({pctOfFirst}%)</span>
                  </div>
                </div>
                {stage.avgDaysInStage !== null && (
                  <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                    {stage.avgDaysInStage}d avg
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
