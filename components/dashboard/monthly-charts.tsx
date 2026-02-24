'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlyData {
  month: string
  onboarding: number
  offboarding: number
  migration: number
}

type StarterFilter = 'ALL' | 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
  contractSignedOn?: string | null
  startDate: string
  isCancelled?: boolean
}

export function MonthlyCharts({ year }: { year: number }) {
  const t = useTranslations('monthlyCharts')
  const commonT = useTranslations('common')
  const [data, setData] = useState<MonthlyData[]>([])
  const [allStarters, setAllStarters] = useState<Starter[]>([])
  const [typeFilter, setTypeFilter] = useState<StarterFilter>('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/starters?year=${year}`)
      .then(res => res.json())
      .then((starters: Starter[]) => {
        setAllStarters(starters)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching monthly data:', error)
        setLoading(false)
      })
  }, [year])

  useEffect(() => {
    if (allStarters.length === 0 && !loading) return
    const starters = allStarters.filter(s => {
      if (s.isCancelled) return false
      if (typeFilter === 'ALL') return true
      return (s.type || 'ONBOARDING') === typeFilter
    })

    const monthlyMap = new Map<number, { onboarding: number; offboarding: number; migration: number }>()
    
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, { onboarding: 0, offboarding: 0, migration: 0 })
    }

    starters.forEach((starter: Starter) => {
      const date = new Date(starter.startDate)
      const month = date.getMonth()
      const current = monthlyMap.get(month)!
      const starterType = starter.type || 'ONBOARDING'
      
      if (starterType === 'MIGRATION') {
        current.migration++
      } else if (starterType === 'OFFBOARDING') {
        current.offboarding++
      } else {
        current.onboarding++
      }
    })

    const monthNames = t.raw('months') as string[]

    const chartData: MonthlyData[] = Array.from(monthlyMap.entries()).map(([month, counts]) => ({
      month: monthNames[month],
      onboarding: counts.onboarding,
      offboarding: counts.offboarding,
      migration: counts.migration,
    }))

    setData(chartData)
  }, [allStarters, typeFilter, loading])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitleYear', { year })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {commonT('loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalOnboarding = data.reduce((sum, month) => sum + month.onboarding, 0)
  const totalOffboarding = data.reduce((sum, month) => sum + month.offboarding, 0)
  const totalMigration = data.reduce((sum, month) => sum + month.migration, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('subtitleTotal', { year, onboarding: totalOnboarding, offboarding: totalOffboarding, migration: totalMigration })}
            </CardDescription>
          </div>
          <Select value={typeFilter} onValueChange={(v: StarterFilter) => setTypeFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filterAll')}</SelectItem>
              <SelectItem value="ONBOARDING">{t('filterOnboarding')}</SelectItem>
              <SelectItem value="OFFBOARDING">{t('filterOffboarding')}</SelectItem>
              <SelectItem value="MIGRATION">{t('filterMigration')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '20px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar 
                dataKey="onboarding" 
                name={t('onboardingLabel')}
                fill="hsl(142 71% 45%)" 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="offboarding" 
                name={t('offboardingLabel')}
                fill="hsl(25 95% 53%)" 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="migration" 
                name={t('migrationLabel')}
                fill="hsl(217 91% 60%)" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

