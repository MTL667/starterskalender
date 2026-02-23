'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlyData {
  month: string
  starters: number
  cancelled: number
}

type StarterFilter = 'ALL' | 'ONBOARDING' | 'OFFBOARDING'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING'
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
      if (typeFilter === 'ALL') return true
      return (s.type || 'ONBOARDING') === typeFilter
    })
        // Groepeer per maand
        const monthlyMap = new Map<number, { total: number; cancelled: number }>()
        
        // Initialiseer alle maanden
        for (let i = 0; i < 12; i++) {
          monthlyMap.set(i, { total: 0, cancelled: 0 })
        }

        // Tel starters per maand
        starters.forEach((starter: Starter) => {
          const date = new Date(starter.startDate)
          const month = date.getMonth() // 0-11
          const current = monthlyMap.get(month)!
          
          if (starter.isCancelled) {
            current.cancelled++
          } else {
            current.total++
          }
        })

        // Converteer naar chart data
        const monthNames = t.raw('months') as string[]

        const chartData: MonthlyData[] = Array.from(monthlyMap.entries()).map(([month, counts]) => ({
          month: monthNames[month],
          starters: counts.total,
          cancelled: counts.cancelled,
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

  const totalStarters = data.reduce((sum, month) => sum + month.starters, 0)
  const totalCancelled = data.reduce((sum, month) => sum + month.cancelled, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('subtitleTotal', { year, total: totalStarters, cancelled: totalCancelled })}
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
                dataKey="starters" 
                name={t('activeStarters')}
                fill="hsl(var(--primary))" 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="cancelled" 
                name={t('cancelledLabel')}
                fill="hsl(var(--destructive))" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

