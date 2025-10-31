'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { StarterDialog } from '@/components/kalender/starter-dialog'
import { useSession } from 'next-auth/react'

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

interface Entity {
  id: string
  name: string
  colorHex: string
}

export function RecentStarters({ year }: { year: number }) {
  const { data: session } = useSession()
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)

  // Check if user can edit starters
  const canEdit = session?.user?.role === 'HR_ADMIN' || session?.user?.role === 'ENTITY_EDITOR'

  // Check if starter starts today
  const isToday = (startDate: string): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    return start.getTime() === today.getTime()
  }

  // Check if starter is within 7 days from now (but not today)
  const isWithin7Days = (startDate: string): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const diffInMs = start.getTime() - today.getTime()
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
    return diffInDays >= 1 && diffInDays <= 7
  }

  const handleStarterClick = (starter: Starter) => {
    setSelectedStarter(starter)
    setDialogOpen(true)
  }

  const handleDialogClose = (refreshData?: boolean) => {
    setDialogOpen(false)
    setSelectedStarter(null)
    
    if (refreshData) {
      // Refresh the starters list
      setLoading(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      fetch(`/api/starters?year=${year}`)
        .then(res => res.json())
        .then(data => {
          const upcoming = data
            .filter((s: Starter) => {
              const startDate = new Date(s.startDate)
              return startDate >= today && !s.isCancelled
            })
            .sort((a: Starter, b: Starter) => 
              new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            )
            .slice(0, 5)
          setStarters(upcoming)
          setLoading(false)
        })
        .catch(error => {
          console.error('Error fetching upcoming starters:', error)
          setLoading(false)
        })
    }
  }

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start van vandaag
    
    // Fetch both starters and entities
    Promise.all([
      fetch(`/api/starters?year=${year}`).then(res => res.json()),
      fetch('/api/entities').then(res => res.json())
    ])
      .then(([startersData, entitiesData]) => {
        // Filter op aankomende starters (vanaf vandaag) en niet geannuleerd
        const upcoming = startersData
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
        setEntities(entitiesData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
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
            {starters.map(starter => {
              const startingToday = isToday(starter.startDate)
              const within7Days = isWithin7Days(starter.startDate)
              const isHighlighted = startingToday || within7Days
              
              return (
                <div
                  key={starter.id}
                  onClick={() => handleStarterClick(starter)}
                  className={`flex items-center justify-between border-b pb-3 last:border-0 transition-all cursor-pointer hover:scale-[1.02] ${
                    startingToday
                      ? 'bg-green-50 dark:bg-green-950/20 -mx-4 px-4 py-3 rounded-lg border-l-4 border-l-green-500 shadow-sm hover:shadow-md hover:bg-green-100 dark:hover:bg-green-900/30'
                      : within7Days 
                        ? 'bg-amber-50 dark:bg-amber-950/20 -mx-4 px-4 py-3 rounded-lg border-l-4 border-l-amber-500 shadow-sm hover:shadow-md hover:bg-amber-100 dark:hover:bg-amber-900/30' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleStarterClick(starter)
                    }
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium">{starter.name}</div>
                      {starter.language && (
                        <span className="text-sm" title={starter.language === 'NL' ? 'Nederlands' : 'Frans'}>
                          {starter.language === 'NL' ? '🇳🇱' : '🇫🇷'}
                        </span>
                      )}
                      {startingToday && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700">
                          ✨ Start vandaag
                        </Badge>
                      )}
                      {within7Days && !startingToday && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700">
                          🔔 Start binnenkort
                        </Badge>
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
                    <div className={`text-sm ${
                      startingToday 
                        ? 'font-semibold text-green-700 dark:text-green-400' 
                        : within7Days 
                          ? 'font-semibold text-amber-700 dark:text-amber-400' 
                          : 'text-muted-foreground'
                    }`}>
                      {format(new Date(starter.startDate), 'dd MMM yyyy', { locale: nl })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Starter Dialog */}
      {dialogOpen && (
        <StarterDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          starter={selectedStarter}
          canEdit={canEdit}
          entities={entities}
        />
      )}
    </Card>
  )
}

