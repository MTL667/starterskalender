'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Briefcase, Users, Clock, TrendingUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DashboardData {
  activeVacancies: number
  totalCandidates: number
  avgTimeToHire: number | null
  hiredLast6Months: number
  byEntity: Array<{ name: string; colorHex: string; candidates: number; vacancies: number }>
}

interface Entity {
  id: string
  name: string
}

const ALL_VALUE = '__ALL__'

export function DashboardMetrics() {
  const t = useTranslations('recruitment.dashboard')
  const [data, setData] = useState<DashboardData | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [filterEntity, setFilterEntity] = useState(ALL_VALUE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/entities').then(r => r.json()).then(d => setEntities(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    const params = filterEntity !== ALL_VALUE ? `?entityId=${filterEntity}` : ''
    try {
      const res = await fetch(`/api/recruitment/dashboard${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
      }
    } finally { setLoading(false) }
  }, [filterEntity])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  return (
    <div className="space-y-6">
      {entities.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('filterEntity')}</span>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{t('allEntities')}</SelectItem>
              {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Briefcase className="h-5 w-5" />}
              label={t('activeVacancies')}
              value={data.activeVacancies}
            />
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              label={t('totalCandidates')}
              value={data.totalCandidates}
            />
            <MetricCard
              icon={<Clock className="h-5 w-5" />}
              label={t('avgTimeToHire')}
              value={data.avgTimeToHire !== null ? `${data.avgTimeToHire}d` : '—'}
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              label={t('hiredRecently')}
              value={data.hiredLast6Months}
            />
          </div>

          {data.byEntity.length > 1 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('byEntity')}</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.byEntity.map(entity => (
                  <div key={entity.name} className="rounded-lg border p-3 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entity.colorHex }} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{entity.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entity.vacancies} {t('vacanciesLabel')} · {entity.candidates} {t('candidatesLabel')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
