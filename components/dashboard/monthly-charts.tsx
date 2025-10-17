'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlyData {
  month: string
  starters: number
  cancelled: number
}

interface Starter {
  id: string
  startDate: string
  isCancelled?: boolean
}

export function MonthlyCharts({ year }: { year: number }) {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/starters?year=${year}`)
      .then(res => res.json())
      .then((starters: Starter[]) => {
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
        const monthNames = [
          'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun',
          'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
        ]

        const chartData: MonthlyData[] = Array.from(monthlyMap.entries()).map(([month, counts]) => ({
          month: monthNames[month],
          starters: counts.total,
          cancelled: counts.cancelled,
        }))

        setData(chartData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching monthly data:', error)
        setLoading(false)
      })
  }, [year])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maandelijkse Statistieken</CardTitle>
          <CardDescription>Starters per maand in {year}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Laden...
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
        <CardTitle>Maandelijkse Statistieken</CardTitle>
        <CardDescription>
          Starters per maand in {year} - Totaal: {totalStarters} actief, {totalCancelled} geannuleerd
        </CardDescription>
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
                name="Actieve Starters"
                fill="hsl(var(--primary))" 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="cancelled" 
                name="Geannuleerd"
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

