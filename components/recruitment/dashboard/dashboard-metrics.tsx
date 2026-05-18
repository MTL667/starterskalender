'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Briefcase, Users, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
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
              color="text-blue-600 dark:text-blue-400"
              borderColor="border-l-blue-500"
            />
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              label={t('totalCandidates')}
              value={data.totalCandidates}
              color="text-emerald-600 dark:text-emerald-400"
              borderColor="border-l-emerald-500"
            />
            <MetricCard
              icon={<Clock className="h-5 w-5" />}
              label={t('avgTimeToHire')}
              value={data.avgTimeToHire !== null ? `${data.avgTimeToHire}d` : '—'}
              color="text-amber-600 dark:text-amber-400"
              borderColor="border-l-amber-500"
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              label={t('hiredRecently')}
              value={data.hiredLast6Months}
              color="text-purple-600 dark:text-purple-400"
              borderColor="border-l-purple-500"
            />
          </div>

          {data.byEntity.length > 1 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('byEntity')}</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.byEntity.map(entity => (
                  <Card key={entity.name} className="border-l-4 hover:shadow-sm transition-shadow" style={{ borderLeftColor: entity.colorHex }}>
                    <CardContent className="py-3 px-4">
                      <p className="font-medium text-sm truncate">{entity.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entity.vacancies} {t('vacanciesLabel')} · {entity.candidates} {t('candidatesLabel')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value, color, borderColor }: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  color: string
  borderColor: string
}) {
  return (
    <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
      <CardContent className="pt-5 pb-4">
        <div className={`flex items-center gap-2 ${color} mb-2`}>
          {icon}
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
