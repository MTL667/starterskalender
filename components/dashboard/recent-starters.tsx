'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { useLocale } from 'next-intl'
import { getDateLocale } from '@/lib/date-locale'
import { StarterDialog } from '@/components/kalender/starter-dialog'
import { useSession } from 'next-auth/react'
import { PlaneLanding, PlaneTakeoff, ArrowLeftRight } from 'lucide-react'
import { HealthDot } from '@/components/health-badge'
import { useHealthScores } from '@/lib/use-health-scores'

type BoardMode = 'arrivals' | 'departures'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
  firstName: string
  lastName: string
  language?: string
  roleTitle?: string | null
  contractSignedOn?: string | null
  startDate: string | null
  isPendingBoarding?: boolean
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

interface RecentStartersProps {
  year: number
  mode?: BoardMode
}

const TYPE_FILTER: Record<BoardMode, string[]> = {
  arrivals: ['ONBOARDING', 'MIGRATION'],
  departures: ['OFFBOARDING'],
}

export function RecentStarters({ year, mode = 'arrivals' }: RecentStartersProps) {
  const t = useTranslations('recentStarters')
  const commonT = useTranslations('common')
  const starterCardT = useTranslations('starterCard')
  const dateLocale = getDateLocale(useLocale())
  const { data: session } = useSession()
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)

  const canEdit = session?.user?.role === 'HR_ADMIN' || session?.user?.role === 'ENTITY_EDITOR'

  const starterIds = starters.map(s => s.id)
  const { scores: healthScores } = useHealthScores(starterIds)

  const isToday = (startDate: string | null): boolean => {
    if (!startDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    return start.getTime() === today.getTime()
  }

  const isWithin7Days = (startDate: string | null): boolean => {
    if (!startDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const diffInMs = start.getTime() - today.getTime()
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
    return diffInDays >= 1 && diffInDays <= 7
  }

  const getUpcomingStarters = (allStarters: Starter[], minCount: number = 5): Starter[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const allowedTypes = TYPE_FILTER[mode]

    const upcoming = allStarters
      .filter((s: Starter) => {
        if (!s.startDate || s.isCancelled) return false
        if (!allowedTypes.includes(s.type || 'ONBOARDING')) return false
        const startDate = new Date(s.startDate)
        return startDate >= today
      })
      .sort((a: Starter, b: Starter) => 
        new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime()
      )

    if (upcoming.length <= minCount) {
      return upcoming
    }

    const initial = upcoming.slice(0, minCount)
    const lastDate = new Date(initial[initial.length - 1].startDate!)
    lastDate.setHours(0, 0, 0, 0)

    const result: Starter[] = []
    for (const starter of upcoming) {
      if (!starter.startDate) continue
      const starterDate = new Date(starter.startDate)
      starterDate.setHours(0, 0, 0, 0)
      if (starterDate.getTime() <= lastDate.getTime()) {
        result.push(starter)
      } else {
        break
      }
    }

    return result
  }

  const handleStarterClick = (starter: Starter) => {
    setSelectedStarter(starter)
    setDialogOpen(true)
  }

  const handleDialogClose = (refreshData?: boolean) => {
    setDialogOpen(false)
    setSelectedStarter(null)
    
    if (refreshData) {
      // Refresh the starters list - fetch current and next year
      setLoading(true)
      
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      
      Promise.all([
        fetch(`/api/starters?year=${currentYear}`).then(res => res.json()),
        fetch(`/api/starters?year=${nextYear}`).then(res => res.json())
      ])
        .then(([currentYearData, nextYearData]) => {
          const allStarters = [...currentYearData, ...nextYearData]
          const upcoming = getUpcomingStarters(allStarters, 5)
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
    // Fetch both current year and next year to ensure we always show upcoming starters
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    
    Promise.all([
      fetch(`/api/starters?year=${currentYear}`).then(res => res.json()),
      fetch(`/api/starters?year=${nextYear}`).then(res => res.json()),
      fetch('/api/entities').then(res => res.json())
    ])
      .then(([currentYearData, nextYearData, entitiesData]) => {
        // Combine both years and get upcoming starters
        const allStarters = [...currentYearData, ...nextYearData]
        const upcoming = getUpcomingStarters(allStarters, 5)
        setStarters(upcoming)
        setEntities(entitiesData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setLoading(false)
      })
  }, []) // No dependency on year anymore - always fetch current + next year

  const boardTitle = mode === 'arrivals' ? t('arrivalsTitle') : t('departuresTitle')
  const boardSubtitle = mode === 'arrivals' ? t('arrivalsSubtitle') : t('departuresSubtitle')
  const boardEmpty = mode === 'arrivals' ? t('noArrivals') : t('noDepartures')
  const BoardIcon = mode === 'arrivals' ? PlaneLanding : PlaneTakeoff

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoardIcon className={`h-5 w-5 ${mode === 'arrivals' ? 'text-green-500' : 'text-red-500'}`} />
            {boardTitle}
          </CardTitle>
          <CardDescription>{boardSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {commonT('loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BoardIcon className={`h-5 w-5 ${mode === 'arrivals' ? 'text-green-500' : 'text-red-500'}`} />
          {boardTitle}
        </CardTitle>
        <CardDescription>{boardSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {starters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BoardIcon className={`h-12 w-12 mx-auto mb-3 opacity-30 ${mode === 'arrivals' ? 'text-green-500' : 'text-red-500'}`} />
            {boardEmpty}
          </div>
        ) : (
          <div className="space-y-4">
            {starters.map(starter => {
              const startingToday = isToday(starter.startDate)
              const within7Days = isWithin7Days(starter.startDate)
              const isDeparture = mode === 'departures'
              const isMigration = starter.type === 'MIGRATION'

              const todayRowClass = isDeparture
                ? 'bg-red-50 dark:bg-red-950/20 -mx-4 px-4 py-3 rounded-lg border-l-4 border-l-red-500 shadow-sm hover:shadow-md hover:bg-red-100 dark:hover:bg-red-900/30'
                : isMigration
                  ? 'bg-blue-50 dark:bg-blue-950/20 -mx-4 px-4 py-3 rounded-lg border-l-4 border-l-blue-500 shadow-sm hover:shadow-md hover:bg-blue-100 dark:hover:bg-blue-900/30'
                  : 'bg-green-50 dark:bg-green-950/20 -mx-4 px-4 py-3 rounded-lg border-l-4 border-l-green-500 shadow-sm hover:shadow-md hover:bg-green-100 dark:hover:bg-green-900/30'

              const soonRowClass = isDeparture
                ? 'bg-orange-50 dark:bg-orange-950/20 -mx-4 px-4 py-3 rounded-lg border-l-4 border-l-orange-400 shadow-sm hover:shadow-md hover:bg-orange-100 dark:hover:bg-orange-900/30'
                : 'bg-amber-50 dark:bg-amber-950/20 -mx-4 px-4 py-3 rounded-lg border-l-4 border-l-amber-500 shadow-sm hover:shadow-md hover:bg-amber-100 dark:hover:bg-amber-900/30'

              const todayBadgeClass = isDeparture
                ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700'
                : isMigration
                  ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700'

              const soonBadgeClass = isDeparture
                ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700'
                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700'

              const todayLabel = isMigration ? t('migratesToday') : isDeparture ? t('departsToday') : t('startToday')
              const soonLabel = isMigration ? t('migratesSoon') : isDeparture ? t('departsSoon') : t('startSoon')

              const dateColor = startingToday
                ? isDeparture ? 'font-semibold text-red-700 dark:text-red-400' : 'font-semibold text-green-700 dark:text-green-400'
                : within7Days
                  ? isDeparture ? 'font-semibold text-orange-700 dark:text-orange-400' : 'font-semibold text-amber-700 dark:text-amber-400'
                  : 'text-muted-foreground'

              return (
                <div
                  key={starter.id}
                  onClick={() => handleStarterClick(starter)}
                  className={`flex items-center justify-between border-b pb-3 last:border-0 transition-all cursor-pointer hover:scale-[1.02] ${
                    startingToday ? todayRowClass : within7Days ? soonRowClass : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'
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
                      {isMigration ? (
                        <ArrowLeftRight className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : isDeparture ? (
                        <PlaneTakeoff className="h-4 w-4 text-red-500 shrink-0" />
                      ) : (
                        <PlaneLanding className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      <div className="font-medium">{starter.firstName} {starter.lastName}</div>
                      {healthScores[starter.id] && (
                        <HealthDot level={healthScores[starter.id].level} />
                      )}
                      {starter.language && (
                        <span className="text-sm" title={starter.language === 'NL' ? starterCardT('languageNL') : starterCardT('languageFR')}>
                          {starter.language === 'NL' ? '🇳🇱' : '🇫🇷'}
                        </span>
                      )}
                      {startingToday && (
                        <Badge variant="outline" className={todayBadgeClass}>
                          {todayLabel}
                        </Badge>
                      )}
                      {within7Days && !startingToday && (
                        <Badge variant="outline" className={soonBadgeClass}>
                          {soonLabel}
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
                    <div className={`text-sm ${dateColor}`}>
                      {starter.startDate ? format(new Date(starter.startDate), 'dd MMM yyyy', { locale: dateLocale }) : '-'}
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

