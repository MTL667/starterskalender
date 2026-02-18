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

interface Starter {
  id: string
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

  if (selectedEntity === 'all') {
    // Alle entiteiten samen - elke entiteit is een aparte bar
    const monthlyMap = new Map<number, { [entityId: string]: number }>()
    
    // Initialiseer alle maanden
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, {})
    }

    // Filter alleen niet-geannuleerde starters
    const activeStarters = starters.filter(s => !s.isCancelled)

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
    // Individuele entiteit - toon actief vs geannuleerd
    const monthlyMap = new Map<number, { active: number; cancelled: number }>()
    
    // Initialiseer alle maanden
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, { active: 0, cancelled: 0 })
    }

    // Filter starters voor deze entiteit
    const entityStarters = starters.filter(s => s.entityId === selectedEntity)

    // Tel per maand
    entityStarters.forEach(starter => {
      const date = new Date(starter.startDate)
      const month = date.getMonth()
      const monthData = monthlyMap.get(month)!
      
      if (starter.isCancelled) {
        monthData.cancelled++
      } else {
        monthData.active++
      }
    })

    // Converteer naar chart data
    chartData = Array.from(monthlyMap.entries()).map(([month, counts]) => ({
      month: monthNames[month],
      active: counts.active,
      cancelled: counts.cancelled,
    }))

    // Definieer bars voor deze entiteit
    const selectedEntityObj = entities.find(e => e.id === selectedEntity)
    barsToRender = [
      {
        dataKey: 'active',
        name: t('active'),
        color: selectedEntityObj?.colorHex || 'hsl(var(--primary))',
      },
      {
        dataKey: 'cancelled',
        name: t('cancelled'),
        color: 'hsl(var(--destructive))',
      },
    ]
  }

  // Bereken totalen
  const total = starters.filter(s => 
    !s.isCancelled && 
    (selectedEntity === 'all' ? true : s.entityId === selectedEntity)
  ).length

  const cancelled = starters.filter(s => 
    s.isCancelled && 
    (selectedEntity === 'all' ? true : s.entityId === selectedEntity)
  ).length

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
                total, 
                cancelledPart: cancelled > 0 ? `, ${cancelled} ${t('cancelled')}` : '' 
              })}
            </CardDescription>
          </div>
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

