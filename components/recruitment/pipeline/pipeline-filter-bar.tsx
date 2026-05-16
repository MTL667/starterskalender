'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3 } from 'lucide-react'

const SOURCES = ['ALL', 'DIRECT', 'REFERRAL', 'LINKEDIN', 'OTHER'] as const

export interface PipelineFilters {
  source: string
  daysMin: string
  daysMax: string
}

interface PipelineFilterBarProps {
  filters: PipelineFilters
  onFiltersChange: (filters: PipelineFilters) => void
  compareCount?: number
  onCompare?: () => void
}

export function PipelineFilterBar({ filters, onFiltersChange, compareCount = 0, onCompare }: PipelineFilterBarProps) {
  const t = useTranslations('recruitment')

  return (
    <div className="flex items-end gap-4 pb-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t('pipeline.filterSource')}</Label>
        <Select
          value={filters.source}
          onValueChange={(value) => onFiltersChange({ ...filters, source: value })}
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'ALL' ? t('pipeline.filterAll') : t(`candidate.source_${s.toLowerCase()}` as any)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t('pipeline.filterDays')}</Label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={filters.daysMin}
            onChange={(e) => onFiltersChange({ ...filters, daysMin: e.target.value })}
            className="w-16 h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            placeholder="∞"
            value={filters.daysMax}
            onChange={(e) => onFiltersChange({ ...filters, daysMax: e.target.value })}
            className="w-16 h-8 text-sm"
          />
        </div>
      </div>

      {onCompare && compareCount >= 2 && (
        <Button
          size="sm"
          className="h-8 self-end"
          onClick={onCompare}
        >
          <BarChart3 className="h-4 w-4 mr-1.5" />
          {t('comparison.compare')} ({compareCount})
        </Button>
      )}
    </div>
  )
}
