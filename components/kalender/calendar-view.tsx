'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Plus, Search, Download } from 'lucide-react'
import { StarterCard } from './starter-card'
import { StarterDialog } from './starter-dialog'
import { getWeeksInYear } from '@/lib/week-utils'
import { Badge } from '@/components/ui/badge'

interface Starter {
  id: string
  name: string
  roleTitle?: string | null
  region?: string | null
  startDate: string
  weekNumber: number | null
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

export function CalendarView({ initialYear }: { initialYear: number }) {
  const [year, setYear] = useState(initialYear)
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)

  const weeksInYear = getWeeksInYear(year)

  // Fetch starters en entities
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/starters?year=${year}`).then(res => res.json()),
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
  }, [year])

  // Filter starters
  const filteredStarters = starters.filter(starter => {
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
      fetch(`/api/starters?year=${year}`)
        .then(res => res.json())
        .then(data => setStarters(data))
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setYear(year - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold text-lg min-w-[80px] text-center">
              {year}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setYear(year + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 flex gap-2">
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
          </div>

          <div className="flex gap-2">
            <Button onClick={handleNewStarter}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Starter
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: weeksInYear }, (_, i) => i + 1).map(weekNum => {
            const weekStarters = startersByWeek.get(weekNum) || []
            
            return (
              <Card key={weekNum} className="p-4">
                <div className="font-semibold mb-3 text-sm text-muted-foreground">
                  Week {weekNum}
                </div>
                <div className="space-y-2">
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
      )}

      {/* Totaal */}
      <div className="text-center text-sm text-muted-foreground">
        {filteredStarters.length} starter{filteredStarters.length !== 1 ? 's' : ''} in {year}
      </div>

      {/* Starter Dialog */}
      <StarterDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        starter={selectedStarter}
        entities={entities}
      />
    </div>
  )
}

