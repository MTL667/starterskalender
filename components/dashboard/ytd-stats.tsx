'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface YTDData {
  year: number
  totalYTD: number
  entities: Array<{
    entityId: string
    entityName: string
    entityColor: string
    count: number
  }>
}

export function YTDStats({ year }: { year: number }) {
  const [data, setData] = useState<YTDData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stats/ytd?year=${year}`)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching YTD stats:', error)
        setLoading(false)
      })
  }, [year])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>YTD Tellers</CardTitle>
          <CardDescription>Starters tot en met vandaag in {year}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Laden...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>YTD Tellers</CardTitle>
        <CardDescription>Starters tot en met vandaag in {year}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Totaal */}
          <div className="border-l-4 border-primary pl-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Totaal
            </div>
            <div className="text-4xl font-bold">{data.totalYTD}</div>
          </div>

          {/* Per entiteit */}
          {data.entities.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-3">Per Entiteit</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.entities.map(entity => (
                  <div
                    key={entity.entityId}
                    className="border rounded-lg p-4"
                    style={{ borderLeftColor: entity.entityColor, borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        style={{
                          backgroundColor: entity.entityColor,
                          color: 'white',
                        }}
                      >
                        {entity.entityName}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{entity.count}</div>
                    <div className="text-sm text-muted-foreground">
                      starter{entity.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.entities.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Nog geen starters dit jaar
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

