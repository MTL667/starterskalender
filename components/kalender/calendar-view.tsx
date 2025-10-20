'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Plus, Search, Download, Calendar } from 'lucide-react'
import { StarterCard } from './starter-card'
import { StarterDialog } from './starter-dialog'
import { getWeeksInYear } from '@/lib/week-utils'
import { Badge } from '@/components/ui/badge'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getWeek, getMonth, getYear, addWeeks, addMonths, addYears, format } from 'date-fns'
import { nl } from 'date-fns/locale'

type ViewMode = 'week' | 'month' | 'year'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  startDate: string
  weekNumber: number | null
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

export function CalendarView({ initialYear, canEdit }: { initialYear: number; canEdit: boolean }) {
  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(today) // Voor week/maand navigatie
  const [year, setYear] = useState(initialYear) // Voor jaar view
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)

  const weeksInYear = getWeeksInYear(year)

  // Bepaal het jaar om te fetchen op basis van view mode
  const fetchYear = viewMode === 'year' ? year : getYear(currentDate)

  // Fetch starters en entities
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/starters?year=${fetchYear}`).then(res => res.json()),
      fetch('/api/entities').then(res => res.json()),
    ])
      .then(([startersData, entitiesData]) => {
        setStarters(startersData)
        setEntities(entitiesData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setLoading(false)
      })
  }, [fetchYear])

  // Bepaal de datum range voor filtering op basis van view mode
  let dateRangeStart: Date, dateRangeEnd: Date
  if (viewMode === 'week') {
    dateRangeStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    dateRangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  } else if (viewMode === 'month') {
    dateRangeStart = startOfMonth(currentDate)
    dateRangeEnd = endOfMonth(currentDate)
  } else {
    dateRangeStart = startOfYear(new Date(year, 0, 1))
    dateRangeEnd = endOfYear(new Date(year, 0, 1))
  }

  // Filter starters
  const filteredStarters = starters.filter(starter => {
    // Filter op datum range (voor week en maand view)
    if (viewMode !== 'year') {
      const starterDate = new Date(starter.startDate)
      if (starterDate < dateRangeStart || starterDate > dateRangeEnd) {
        return false
      }
    }

    // Filter op entiteit
    if (selectedEntity !== 'all' && starter.entity?.id !== selectedEntity) {
      return false
    }

    // Filter op zoekterm
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        starter.name.toLowerCase().includes(query) ||
        starter.roleTitle?.toLowerCase().includes(query) ||
        starter.region?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Groepeer starters per week
  const startersByWeek = new Map<number, Starter[]>()
  filteredStarters.forEach(starter => {
    if (starter.weekNumber) {
      if (!startersByWeek.has(starter.weekNumber)) {
        startersByWeek.set(starter.weekNumber, [])
      }
      startersByWeek.get(starter.weekNumber)!.push(starter)
    }
  })

  const handleStarterClick = (starter: Starter) => {
    setSelectedStarter(starter)
    setDialogOpen(true)
  }

  const handleNewStarter = () => {
    setSelectedStarter(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (refreshData?: boolean) => {
    setDialogOpen(false)
    setSelectedStarter(null)
    
    if (refreshData) {
      // Refresh starters
      fetch(`/api/starters?year=${fetchYear}`)
        .then(res => res.json())
        .then(data => setStarters(data))
    }
  }

  // Navigatie functies
  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, -1))
    } else if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, -1))
    } else {
      setYear(year - 1)
    }
  }

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1))
    } else if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setYear(year + 1)
    }
  }

  const handleToday = () => {
    if (viewMode === 'year') {
      setYear(getYear(today))
    } else {
      setCurrentDate(today)
    }
  }

  // Formateer de huidige periode voor display
  const getPeriodLabel = () => {
    if (viewMode === 'week') {
      const weekNum = getWeek(currentDate, { weekStartsOn: 1, firstWeekContainsDate: 4 })
      return `Week ${weekNum} - ${format(currentDate, 'yyyy')}`
    } else if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: nl })
    } else {
      return year.toString()
    }
  }

  const exportCSV = async () => {
    const csvData = filteredStarters.map(s => ({
      Naam: s.name,
      Functie: s.roleTitle || '',
      Regio: s.region || '',
      Startdatum: new Date(s.startDate).toLocaleDateString('nl-BE'),
      Week: s.weekNumber || '',
      Entiteit: s.entity?.name || '',
    }))

    const headers = Object.keys(csvData[0] || {})
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `starters-${year}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Filters en acties */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* View mode selector en navigatie */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Maand</SelectItem>
                  <SelectItem value="year">Jaar</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-semibold text-base min-w-[180px] text-center px-2">
                  {getPeriodLabel()}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" onClick={handleToday}>
                Vandaag
              </Button>
            </div>
          </div>

          {/* Zoeken en filters */}
          <div className="flex flex-col sm:flex-row gap-2">

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam, functie of regio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Alle entiteiten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle entiteiten</SelectItem>
                {entities.map(entity => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canEdit && (
              <Button onClick={handleNewStarter}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuw
              </Button>
            )}
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Legenda */}
      {entities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entities.map(entity => (
            <Badge
              key={entity.id}
              style={{
                backgroundColor: entity.colorHex,
                color: 'white',
              }}
            >
              {entity.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Kalender grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Laden...
        </div>
      ) : viewMode === 'year' ? (
        // Jaar view: toon alle weken
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: weeksInYear }, (_, i) => i + 1).map(weekNum => {
            const weekStarters = startersByWeek.get(weekNum) || []
            
            return (
              <Card key={weekNum} className="p-4">
                <div className="font-semibold mb-3 text-sm text-muted-foreground">
                  Week {weekNum}
                </div>
                <div className="space-y-3">
                  {weekStarters.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Geen starters
                    </div>
                  ) : (
                    weekStarters.map(starter => (
                      <StarterCard
                        key={starter.id}
                        starter={starter}
                        onClick={() => handleStarterClick(starter)}
                      />
                    ))
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        // Week/Maand view: toon als lijst gegroepeerd per dag
        <div className="space-y-4">
          {filteredStarters.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                Geen starters in deze {viewMode === 'week' ? 'week' : 'maand'}
              </div>
            </Card>
          ) : (
            // Groepeer per datum
            (() => {
              const startersByDate = new Map<string, Starter[]>()
              filteredStarters.forEach(starter => {
                const dateKey = format(new Date(starter.startDate), 'yyyy-MM-dd')
                if (!startersByDate.has(dateKey)) {
                  startersByDate.set(dateKey, [])
                }
                startersByDate.get(dateKey)!.push(starter)
              })

              const sortedDates = Array.from(startersByDate.keys()).sort()

              return sortedDates.map(dateKey => {
                const dayStarters = startersByDate.get(dateKey) || []
                const date = new Date(dateKey)

                return (
                  <Card key={dateKey} className="p-4">
                    <div className="font-semibold mb-3 text-base">
                      {format(date, 'EEEE d MMMM yyyy', { locale: nl })}
                      <span className="text-sm text-muted-foreground ml-2">
                        (Week {getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 })})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dayStarters.map(starter => (
                        <StarterCard
                          key={starter.id}
                          starter={starter}
                          onClick={() => handleStarterClick(starter)}
                        />
                      ))}
                    </div>
                  </Card>
                )
              })
            })()
          )}
        </div>
      )}

      {/* Totaal */}
      <div className="text-center text-sm text-muted-foreground">
        {filteredStarters.length} starter{filteredStarters.length !== 1 ? 's' : ''} {
          viewMode === 'week' ? 'deze week' :
          viewMode === 'month' ? 'deze maand' :
          `in ${year}`
        }
      </div>

      {/* Starter Dialog */}
      <StarterDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        starter={selectedStarter}
        entities={entities}
        canEdit={canEdit}
      />
    </div>
  )
}

