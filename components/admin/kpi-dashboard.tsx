'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, Clock, Package, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  format,
} from 'date-fns'

interface EntityMetrics {
  entityId: string
  entityName: string
  entityColor: string
  taskCompletion: { onTime: number; late: number; missed: number; total: number; rate: number | null }
  leadTime: { avgDays: number | null; completedCount: number; inProgressCount: number }
  materialCoverage: { avgCoverage: number | null; fullyCoveredCount: number; totalStarterCount: number }
}

interface KpiData {
  dateFrom: string
  dateTo: string
  entities: EntityMetrics[]
  totals: {
    taskCompletion: { onTime: number; late: number; missed: number; total: number; rate: number | null }
    leadTime: { avgDays: number | null; completedCount: number; inProgressCount: number }
    materialCoverage: { avgCoverage: number | null; fullyCoveredCount: number; totalStarterCount: number }
  }
  trends: Record<string, any>[]
}

type PeriodKey = 'month' | 'quarter' | 'year' | 'last12'
type SortField = 'name' | 'completion' | 'leadTime' | 'coverage'
type SortDir = 'asc' | 'desc'
type TrendMetric = 'completion' | 'leadTime' | 'coverage'

function getPeriodRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date()
  switch (period) {
    case 'month':
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() }
    case 'quarter':
      return { from: startOfQuarter(now).toISOString(), to: endOfQuarter(now).toISOString() }
    case 'year':
      return { from: startOfYear(now).toISOString(), to: endOfYear(now).toISOString() }
    case 'last12':
      return { from: startOfMonth(subMonths(now, 11)).toISOString(), to: endOfMonth(now).toISOString() }
  }
}

export function KpiDashboard() {
  const t = useTranslations('kpi')
  const [data, setData] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>('year')
  const [trendMonths, setTrendMonths] = useState('6')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('completion')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const range = getPeriodRange(period)
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        trendMonths,
      })
      const res = await fetch(`/api/stats/kpi?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Error fetching KPI data:', error)
    } finally {
      setLoading(false)
    }
  }, [period, trendMonths])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedEntities = data?.entities.slice().sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name':
        return a.entityName.localeCompare(b.entityName) * dir
      case 'completion':
        return ((a.taskCompletion.rate ?? -1) - (b.taskCompletion.rate ?? -1)) * dir
      case 'leadTime':
        return ((a.leadTime.avgDays ?? 999) - (b.leadTime.avgDays ?? 999)) * dir
      case 'coverage':
        return ((a.materialCoverage.avgCoverage ?? -1) - (b.materialCoverage.avgCoverage ?? -1)) * dir
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const trendSuffix = trendMetric === 'completion' ? '_completion' : trendMetric === 'leadTime' ? '_leadTime' : '_coverage'
  const trendLabel = trendMetric === 'completion' ? t('taskCompletionRate') : trendMetric === 'leadTime' ? t('avgLeadTime') : t('materialCoverage')
  const trendUnit = trendMetric === 'leadTime' ? ` (${t('days')})` : ' (%)'

  if (loading && !data) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{t('thisMonth')}</SelectItem>
            <SelectItem value="quarter">{t('thisQuarter')}</SelectItem>
            <SelectItem value="year">{t('thisYear')}</SelectItem>
            <SelectItem value="last12">{t('last12Months')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('taskCompletionRate')}
            </CardDescription>
            <CardTitle className="text-4xl">
              {data?.totals.taskCompletion.rate != null ? `${data.totals.taskCompletion.rate}%` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 text-sm text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">{data?.totals.taskCompletion.onTime ?? 0} {t('onTime')}</span>
              <span className="text-orange-600 dark:text-orange-400">{data?.totals.taskCompletion.late ?? 0} {t('late')}</span>
              <span className="text-red-600 dark:text-red-400">{data?.totals.taskCompletion.missed ?? 0} {t('missed')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('avgLeadTime')}
            </CardDescription>
            <CardTitle className="text-4xl">
              {data?.totals.leadTime.avgDays != null ? `${data.totals.leadTime.avgDays}` : '—'}
              {data?.totals.leadTime.avgDays != null && <span className="text-lg font-normal ml-1">{t('days')}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 text-sm text-muted-foreground">
              <span>{data?.totals.leadTime.completedCount ?? 0} {t('completed')}</span>
              <span>{data?.totals.leadTime.inProgressCount ?? 0} {t('inProgress')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('materialCoverage')}
            </CardDescription>
            <CardTitle className="text-4xl">
              {data?.totals.materialCoverage.avgCoverage != null ? `${data.totals.materialCoverage.avgCoverage}%` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 text-sm text-muted-foreground">
              <span>{data?.totals.materialCoverage.fullyCoveredCount ?? 0} {t('fullyCovered')}</span>
              <span>{data?.totals.materialCoverage.totalStarterCount ?? 0} {t('totalStarters')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Entity Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('entityComparison')}</CardTitle>
          <CardDescription>{t('entityComparisonDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedEntities && sortedEntities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">
                      <button onClick={() => toggleSort('name')} className="flex items-center hover:text-foreground">
                        {t('entity')}<SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      <button onClick={() => toggleSort('completion')} className="flex items-center justify-end hover:text-foreground ml-auto">
                        {t('completionRate')}<SortIcon field="completion" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      <button onClick={() => toggleSort('leadTime')} className="flex items-center justify-end hover:text-foreground ml-auto">
                        {t('leadTime')}<SortIcon field="leadTime" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      <button onClick={() => toggleSort('coverage')} className="flex items-center justify-end hover:text-foreground ml-auto">
                        {t('coverage')}<SortIcon field="coverage" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">{t('tasks')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntities.map((e) => (
                    <tr key={e.entityId} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: e.entityColor }}
                          />
                          {e.entityName}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 font-mono">
                        {e.taskCompletion.rate != null ? (
                          <span className={e.taskCompletion.rate >= 80 ? 'text-green-600 dark:text-green-400' : e.taskCompletion.rate >= 50 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}>
                            {e.taskCompletion.rate}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-right py-3 px-2 font-mono">
                        {e.leadTime.avgDays != null ? `${e.leadTime.avgDays}d` : '—'}
                      </td>
                      <td className="text-right py-3 px-2 font-mono">
                        {e.materialCoverage.avgCoverage != null ? (
                          <span className={e.materialCoverage.avgCoverage >= 80 ? 'text-green-600 dark:text-green-400' : e.materialCoverage.avgCoverage >= 50 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}>
                            {e.materialCoverage.avgCoverage}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-right py-3 px-2 text-muted-foreground">
                        {e.taskCompletion.total > 0 ? (
                          <span>{e.taskCompletion.onTime}/{e.taskCompletion.total}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('trendAnalysis')}
              </CardTitle>
              <CardDescription>{t('trendDesc')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Tabs value={trendMetric} onValueChange={(v) => setTrendMetric(v as TrendMetric)}>
                <TabsList>
                  <TabsTrigger value="completion">{t('completion')}</TabsTrigger>
                  <TabsTrigger value="leadTime">{t('leadTimeShort')}</TabsTrigger>
                  <TabsTrigger value="coverage">{t('coverageShort')}</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={trendMonths} onValueChange={setTrendMonths}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t('months3')}</SelectItem>
                  <SelectItem value="6">{t('months6')}</SelectItem>
                  <SelectItem value="12">{t('months12')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data?.trends && data.trends.length > 0 && data.entities.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit={trendUnit} />
                <Tooltip />
                <Legend />
                {data.entities.map((entity) => (
                  <Line
                    key={entity.entityId}
                    type="monotone"
                    dataKey={`${entity.entityId}${trendSuffix}`}
                    name={entity.entityName}
                    stroke={entity.entityColor}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">{t('noTrendData')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
