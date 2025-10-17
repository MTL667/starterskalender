'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  startDate: string
  isCancelled?: boolean
  entity?: {
    id: string
    name: string
    colorHex: string
  } | null
}

export function RecentStarters({ year }: { year: number }) {
  const [starters, setStarters] = useState<Starter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start van vandaag
    
    fetch(`/api/starters?year=${year}`)
      .then(res => res.json())
      .then(data => {
        // Filter op aankomende starters (vanaf vandaag) en niet geannuleerd
        const upcoming = data
          .filter((s: Starter) => {
            const startDate = new Date(s.startDate)
            return startDate >= today && !s.isCancelled
          })
          // Sorteer op startDate ascending (vroegste eerst)
          .sort((a: Starter, b: Starter) => 
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          )
          .slice(0, 5) // Neem de eerste 5
        setStarters(upcoming)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching upcoming starters:', error)
        setLoading(false)
      })
  }, [year])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aankomende Starters</CardTitle>
          <CardDescription>De eerstvolgende starters in {year}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Laden...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aankomende Starters</CardTitle>
        <CardDescription>De eerstvolgende starters in {year}</CardDescription>
      </CardHeader>
      <CardContent>
        {starters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Geen aankomende starters
          </div>
        ) : (
          <div className="space-y-4">
            {starters.map(starter => (
              <div
                key={starter.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{starter.name}</div>
                    {starter.language && (
                      <span className="text-sm" title={starter.language === 'NL' ? 'Nederlands' : 'Frans'}>
                        {starter.language === 'NL' ? '🇳🇱' : '🇫🇷'}
                      </span>
                    )}
                  </div>
                  {starter.roleTitle && (
                    <div className="text-sm text-muted-foreground">
                      {starter.roleTitle}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {starter.entity && (
                    <Badge
                      style={{
                        backgroundColor: starter.entity.colorHex,
                        color: 'white',
                      }}
                    >
                      {starter.entity.name}
                    </Badge>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(starter.startDate), 'dd MMM yyyy', { locale: nl })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

