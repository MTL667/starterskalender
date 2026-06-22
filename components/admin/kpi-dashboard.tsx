'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, Clock, Package, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Plus, UserMinus, HeartHandshake, LogOut, Building2, ToggleLeft, ToggleRight, Check, XCircle, Trash2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
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

interface OffboardingStats {
  year: number
  total: number
  byInitiator: { initiator: string; count: number }[]
  byReason: { reasonId: string; reasonName: string; count: number }[]
  trend: { period: number; count: number; initiator: string | null }[]
}

interface LeaveReasonAdmin {
  id: string
  name: string
  isActive: boolean
  _count: { starters: number }
}

type PeriodKey = 'month' | 'quarter' | 'year' | 'last12'
type SortField = 'name' | 'completion' | 'leadTime' | 'coverage'
type SortDir = 'asc' | 'desc'
type TrendMetric = 'completion' | 'leadTime' | 'coverage'

const INITIATOR_COLORS: Record<string, string> = {
  ENTITY_TERMINATED: '#ef4444',
  MUTUAL_AGREEMENT: '#f59e0b',
  EMPLOYEE_RESIGNED: '#3b82f6',
  NOT_SET: '#94a3b8',
}

const REASON_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#ef4444', '#f59e0b', '#3b82f6']

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

function OperationalTab() {
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
  const trendUnit = trendMetric === 'leadTime' ? ` (${t('days')})` : ' (%)'

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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

type OffboardingPeriod = 'year' | 'quarter' | 'month'

function OffboardingTab({ canManageReasons }: { canManageReasons: boolean }) {
  const t = useTranslations('kpi')
  const [stats, setStats] = useState<OffboardingStats | null>(null)
  const [reasons, setReasons] = useState<LeaveReasonAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState<OffboardingPeriod>('year')
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [newReasonName, setNewReasonName] = useState('')
  const [addingReason, setAddingReason] = useState(false)
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null)
  const [editingReasonName, setEditingReasonName] = useState('')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i, 1), 'MMMM') }))

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year), period })
      if (period === 'quarter') params.set('quarter', String(quarter))
      if (period === 'month') params.set('month', String(month))

      const fetches: Promise<Response>[] = [
        fetch(`/api/stats/offboarding?${params}`),
      ]
      if (canManageReasons) {
        fetches.push(fetch('/api/admin/leave-reasons'))
      }

      const results = await Promise.all(fetches)
      if (results[0].ok) setStats(await results[0].json())
      if (canManageReasons && results[1]?.ok) setReasons(await results[1].json())
    } catch (error) {
      console.error('Error fetching offboarding data:', error)
    } finally {
      setLoading(false)
    }
  }, [year, period, quarter, month, canManageReasons])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddReason = async () => {
    const name = newReasonName.trim()
    if (!name) return
    setAddingReason(true)
    try {
      const res = await fetch('/api/admin/leave-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setNewReasonName('')
        fetchData()
      }
    } catch (err) {
      console.error('Error creating reason:', err)
    } finally {
      setAddingReason(false)
    }
  }

  const handleToggleReason = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/leave-reasons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        setReasons(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r))
      }
    } catch (err) {
      console.error('Error toggling reason:', err)
    }
  }

  const handleRenameReason = async (id: string) => {
    const name = editingReasonName.trim()
    if (!name) return
    try {
      const res = await fetch(`/api/admin/leave-reasons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setReasons(prev => prev.map(r => r.id === id ? { ...r, name } : r))
        setEditingReasonId(null)
        setEditingReasonName('')
      }
    } catch (err) {
      console.error('Error renaming reason:', err)
    }
  }

  const handleDeleteReason = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/leave-reasons/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReasons(prev => prev.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error('Error deleting reason:', err)
    }
  }

  const initiatorLabel = (key: string) => {
    switch (key) {
      case 'ENTITY_TERMINATED': return t('entityTerminated')
      case 'MUTUAL_AGREEMENT': return t('mutualAgreement')
      case 'EMPLOYEE_RESIGNED': return t('employeeResigned')
      default: return t('notSet')
    }
  }

  const initiatorIcon = (key: string) => {
    switch (key) {
      case 'ENTITY_TERMINATED': return <Building2 className="h-4 w-4" />
      case 'MUTUAL_AGREEMENT': return <HeartHandshake className="h-4 w-4" />
      case 'EMPLOYEE_RESIGNED': return <LogOut className="h-4 w-4" />
      default: return null
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pieData = stats?.byInitiator
    .filter(d => d.initiator !== 'NOT_SET' || d.count > 0)
    .map(d => ({
      name: initiatorLabel(d.initiator),
      value: d.count,
      color: INITIATOR_COLORS[d.initiator] || '#94a3b8',
    })) || []

  const barData = stats?.byReason.slice(0, 10).map(d => ({
    name: d.reasonName.length > 20 ? d.reasonName.slice(0, 20) + '…' : d.reasonName,
    fullName: d.reasonName,
    count: d.count,
  })) || []

  const trendData: Record<number, Record<string, number>> = {}
  if (stats?.trend && Array.isArray(stats.trend)) {
    for (const row of stats.trend) {
      if (!trendData[row.period]) trendData[row.period] = { month: row.period }
      const key = row.initiator || 'NOT_SET'
      trendData[row.period][key] = (trendData[row.period][key] || 0) + row.count
    }
  }
  const trendChartData = Object.values(trendData).sort((a, b) => (a.month as number) - (b.month as number))
    .map(d => ({ ...d, month: format(new Date(year, (d.month as number) - 1, 1), 'MMM') }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <UserMinus className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{stats?.total ?? 0}</span>
          <span className="text-muted-foreground">{t('offboardingsInYear', { year })}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as OffboardingPeriod)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">{t('fullYear')}</SelectItem>
              <SelectItem value="quarter">{t('quarterLabel')}</SelectItem>
              <SelectItem value="month">{t('monthLabel')}</SelectItem>
            </SelectContent>
          </Select>
          {period === 'quarter' && (
            <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
          )}
          {period === 'month' && (
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['ENTITY_TERMINATED', 'MUTUAL_AGREEMENT', 'EMPLOYEE_RESIGNED'] as const).map(key => {
          const item = stats?.byInitiator.find(d => d.initiator === key)
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: INITIATOR_COLORS[key] + '20' }}>
                    {initiatorIcon(key)}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{item?.count ?? 0}</p>
                    <p className="text-sm text-muted-foreground">{initiatorLabel(key)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('initiatorDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={(props: any) => `${props.name} (${(props.percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {barData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('topLeaveReasons')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number, _: any, props: any) => [value, props.payload.fullName]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={REASON_COLORS[i % REASON_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {pieData.length === 0 && barData.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">{t('noOffboardingData')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {trendChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('offboardingTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ENTITY_TERMINATED" name={initiatorLabel('ENTITY_TERMINATED')} stackId="a" fill={INITIATOR_COLORS.ENTITY_TERMINATED} />
                <Bar dataKey="MUTUAL_AGREEMENT" name={initiatorLabel('MUTUAL_AGREEMENT')} stackId="a" fill={INITIATOR_COLORS.MUTUAL_AGREEMENT} />
                <Bar dataKey="EMPLOYEE_RESIGNED" name={initiatorLabel('EMPLOYEE_RESIGNED')} stackId="a" fill={INITIATOR_COLORS.EMPLOYEE_RESIGNED} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {canManageReasons && <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('leaveReasonsManagement')}</CardTitle>
              <CardDescription>{t('leaveReasonsManagementDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              value={newReasonName}
              onChange={(e) => setNewReasonName(e.target.value)}
              placeholder={t('newReasonPlaceholder')}
              className="max-w-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddReason()
                }
              }}
            />
            <Button onClick={handleAddReason} disabled={addingReason || !newReasonName.trim()} size="sm">
              {addingReason ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {t('addReason')}
            </Button>
          </div>

          {reasons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">{t('reasonName')}</th>
                    <th className="text-right py-3 px-2 font-medium">{t('timesUsedPeriod')}</th>
                    <th className="text-right py-3 px-2 font-medium">{t('timesUsedTotal')}</th>
                    <th className="text-right py-3 px-2 font-medium">{t('status')}</th>
                    <th className="text-right py-3 px-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {reasons.map((r) => {
                    const periodCount = stats?.byReason.find(br => br.reasonId === r.id)?.count ?? 0
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          {editingReasonId === r.id ? (
                            <div className="flex gap-1 items-center">
                              <Input
                                value={editingReasonName}
                                onChange={(e) => setEditingReasonName(e.target.value)}
                                className="h-7 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleRenameReason(r.id) }
                                  if (e.key === 'Escape') { setEditingReasonId(null) }
                                }}
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRenameReason(r.id)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingReasonId(null)}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="hover:underline text-left"
                              onClick={() => { setEditingReasonId(r.id); setEditingReasonName(r.name) }}
                              title={t('clickToRename')}
                            >
                              {r.name}
                            </button>
                          )}
                        </td>
                        <td className="text-right py-3 px-2 font-mono">{periodCount}</td>
                        <td className="text-right py-3 px-2 font-mono text-muted-foreground">{r._count.starters}</td>
                        <td className="text-right py-3 px-2">
                          <button
                            onClick={() => handleToggleReason(r.id, r.isActive)}
                            className="inline-flex items-center gap-1"
                          >
                            {r.isActive ? (
                              <Badge variant="default" className="cursor-pointer gap-1">
                                <ToggleRight className="h-3 w-3" />{t('active')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="cursor-pointer gap-1">
                                <ToggleLeft className="h-3 w-3" />{t('inactive')}
                              </Badge>
                            )}
                          </button>
                        </td>
                        <td className="text-right py-3 px-2">
                          {r._count.starters === 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteReason(r.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">{t('noReasonsYet')}</p>
          )}
        </CardContent>
      </Card>}
    </div>
  )
}

export function KpiDashboard() {
  const t = useTranslations('kpi')
  const { data: session } = useSession()
  const userPerms: string[] = (session?.user as any)?.perms ?? []
  const canSeeOffboarding = userPerms.includes('admin:users:manage') || userPerms.includes('starters:read:leavereason')
  const canManageReasons = userPerms.includes('admin:users:manage') || userPerms.includes('offboarding:reasons:manage')

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="operational" className="space-y-6">
        <TabsList>
          <TabsTrigger value="operational">{t('tabOperational')}</TabsTrigger>
          {canSeeOffboarding && (
            <TabsTrigger value="offboarding">{t('tabOffboarding')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="operational">
          <OperationalTab />
        </TabsContent>

        {canSeeOffboarding && (
          <TabsContent value="offboarding">
            <OffboardingTab canManageReasons={canManageReasons} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
