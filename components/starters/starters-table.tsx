'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Search, Download, Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarterDialog } from '@/components/kalender/starter-dialog'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
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

export function StartersTable({ initialYear, canEdit }: { initialYear: number; canEdit: boolean }) {
  const [year, setYear] = useState(initialYear)
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)

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

  const filteredStarters = starters.filter(starter => {
    if (selectedEntity !== 'all' && starter.entity?.id !== selectedEntity) {
      return false
    }

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

  const handleRowClick = (starter: Starter) => {
    setSelectedStarter(starter)
    setDialogOpen(true)
  }

  const handleDialogClose = (refreshData?: boolean) => {
    setDialogOpen(false)
    setSelectedStarter(null)
    
    if (refreshData) {
      fetch(`/api/starters?year=${year}`)
        .then(res => res.json())
        .then(data => setStarters(data))
    }
  }

  const exportCSV = () => {
    const csvData = filteredStarters.map(s => ({
      Naam: s.name,
      Taal: s.language || 'NL',
      Functie: s.roleTitle || '',
      Regio: s.region || '',
      Via: s.via || '',
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
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Starters {year}</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[year - 1, year, year + 1].map(y => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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

            <Button onClick={exportCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            {canEdit && (
              <Button onClick={() => { setSelectedStarter(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Starter
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, functie of regio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : filteredStarters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Geen starters gevonden</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Naam</th>
                  <th className="pb-3 font-medium">Taal</th>
                  <th className="pb-3 font-medium">Functie</th>
                  <th className="pb-3 font-medium">Regio</th>
                  <th className="pb-3 font-medium">Via</th>
                  <th className="pb-3 font-medium">Startdatum</th>
                  <th className="pb-3 font-medium">Week</th>
                  <th className="pb-3 font-medium">Entiteit</th>
                </tr>
              </thead>
              <tbody>
                {filteredStarters.map(starter => (
                  <tr
                    key={starter.id}
                    onClick={() => handleRowClick(starter)}
                    className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 font-medium">{starter.name}</td>
                    <td className="py-3 text-sm">
                      <span title={starter.language === 'NL' ? 'Nederlands' : 'Frans'}>
                        {starter.language === 'NL' ? '🇳🇱' : '🇫🇷'} {starter.language || 'NL'}
                      </span>
                    </td>
                    <td className="py-3 text-sm">{starter.roleTitle || '-'}</td>
                    <td className="py-3 text-sm">{starter.region || '-'}</td>
                    <td className="py-3 text-sm">{starter.via || '-'}</td>
                    <td className="py-3 text-sm">
                      {format(new Date(starter.startDate), 'dd MMM yyyy', { locale: nl })}
                    </td>
                    <td className="py-3 text-sm">{starter.weekNumber}</td>
                    <td className="py-3">
                      {starter.entity ? (
                        <Badge
                          style={{
                            backgroundColor: starter.entity.colorHex,
                            color: 'white',
                          }}
                        >
                          {starter.entity.name}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground text-center">
          {filteredStarters.length} starter{filteredStarters.length !== 1 ? 's' : ''} gevonden
        </div>
      </CardContent>

      <StarterDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        starter={selectedStarter}
        entities={entities}
        canEdit={canEdit}
      />
    </Card>
  )
}

