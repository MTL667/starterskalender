'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTranslations } from 'next-intl'

interface Entity {
  id: string
  name: string
  colorHex: string
}

type StarterFilter = 'ALL' | 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
  contractSignedOn?: string | null
  startDate: string
  isCancelled?: boolean
  entityId?: string | null
}

interface MonthlyEntityData {
  month: string
  [key: string]: number | string // Dynamic entity keys
}

export function EntityMonthlyCharts({ year }: { year: number }) {
  const t = useTranslations('entityMonthlyCharts')
  const commonT = useTranslations('common')
  const monthlyChartsT = useTranslations('monthlyCharts')
  const [entities, setEntities] = useState<Entity[]>([])
  const [starters, setStarters] = useState<Starter[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<StarterFilter>('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/entities').then(res => res.json()),
      fetch(`/api/starters?year=${year}`).then(res => res.json()),
    ])
      .then(([entitiesData, startersData]) => {
        setEntities(entitiesData)
        setStarters(startersData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching entity data:', error)
        setLoading(false)
      })
  }, [year])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle', { year })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {commonT('loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const monthNames = monthlyChartsT.raw('months') as string[]

  // Bereken data
  let chartData: MonthlyEntityData[] = []
  let barsToRender: Array<{ dataKey: string; name: string; color: string }> = []

  const filteredByType = starters.filter(s => {
    if (typeFilter === 'ALL') return true
    return (s.type || 'ONBOARDING') === typeFilter
  })

  if (selectedEntity === 'all') {
    const monthlyMap = new Map<number, { [entityId: string]: number }>()
    
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, {})
    }

    const activeStarters = filteredByType.filter(s => !s.isCancelled)

    // Tel starters per maand per entiteit
    activeStarters.forEach(starter => {
      if (!starter.entityId) return // Skip starters zonder entiteit
      
      const date = new Date(starter.startDate)
      const month = date.getMonth()
      const monthData = monthlyMap.get(month)!
      
      if (!monthData[starter.entityId]) {
        monthData[starter.entityId] = 0
      }
      monthData[starter.entityId]++
    })

    // Converteer naar chart data
    chartData = Array.from(monthlyMap.entries()).map(([month, entityCounts]) => {
      const dataPoint: MonthlyEntityData = { month: monthNames[month] }
      
      entities.forEach(entity => {
        dataPoint[entity.id] = entityCounts[entity.id] || 0
      })
      
      return dataPoint
    })

    // Definieer bars voor alle entiteiten
    barsToRender = entities.map(entity => ({
      dataKey: entity.id,
      name: entity.name,
      color: entity.colorHex,
    }))

  } else {
    const monthlyMap = new Map<number, { onboarding: number; offboarding: number; migration: number }>()
    
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, { onboarding: 0, offboarding: 0, migration: 0 })
    }

    const entityStarters = filteredByType.filter(s => s.entityId === selectedEntity && !s.isCancelled)

    entityStarters.forEach(starter => {
      const date = new Date(starter.startDate)
      const month = date.getMonth()
      const monthData = monthlyMap.get(month)!
      const starterType = starter.type || 'ONBOARDING'
      
      if (starterType === 'MIGRATION') {
        monthData.migration++
      } else if (starterType === 'OFFBOARDING') {
        monthData.offboarding++
      } else {
        monthData.onboarding++
      }
    })

    chartData = Array.from(monthlyMap.entries()).map(([month, counts]) => ({
      month: monthNames[month],
      onboarding: counts.onboarding,
      offboarding: counts.offboarding,
      migration: counts.migration,
    }))

    barsToRender = [
      {
        dataKey: 'onboarding',
        name: t('onboarding'),
        color: 'hsl(142 71% 45%)',
      },
      {
        dataKey: 'offboarding',
        name: t('offboarding'),
        color: 'hsl(25 95% 53%)',
      },
      {
        dataKey: 'migration',
        name: t('migration'),
        color: 'hsl(217 91% 60%)',
      },
    ]
  }

  const entityFiltered = filteredByType.filter(s => 
    !s.isCancelled && 
    (selectedEntity === 'all' ? true : s.entityId === selectedEntity)
  )
  const onboardingCount = entityFiltered.filter(s => (s.type || 'ONBOARDING') === 'ONBOARDING').length
  const offboardingCount = entityFiltered.filter(s => (s.type || 'ONBOARDING') === 'OFFBOARDING').length
  const migrationCount = entityFiltered.filter(s => (s.type || 'ONBOARDING') === 'MIGRATION').length

  const selectedEntityName = selectedEntity === 'all' 
    ? t('allEntities')
    : entities.find(e => e.id === selectedEntity)?.name || ''

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('subtitleSelected', { 
                entityName: selectedEntityName, 
                onboarding: onboardingCount,
                offboarding: offboardingCount,
                migration: migrationCount,
              })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(v: StarterFilter) => setTypeFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{monthlyChartsT('filterAll')}</SelectItem>
                <SelectItem value="ONBOARDING">{monthlyChartsT('filterOnboarding')}</SelectItem>
                <SelectItem value="OFFBOARDING">{monthlyChartsT('filterOffboarding')}</SelectItem>
                <SelectItem value="MIGRATION">{monthlyChartsT('filterMigration')}</SelectItem>
              </SelectContent>
            </Select>
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('selectAll')}</SelectItem>
              {entities.map(entity => (
                <SelectItem key={entity.id} value={entity.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: entity.colorHex }}
                    />
                    {entity.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
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
              {barsToRender.map(bar => (
                <Bar
                  key={bar.dataKey}
                  dataKey={bar.dataKey}
                  name={bar.name}
                  fill={bar.color}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

