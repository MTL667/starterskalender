'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Search, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarterDialog } from '@/components/kalender/starter-dialog'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { getExperienceText } from '@/lib/experience-utils'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type SortColumn = 'name' | 'roleTitle' | 'region' | 'startDate' | 'entity'
type SortDirection = 'asc' | 'desc'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  contractSignedOn: string
  startDate: string
  weekNumber: number | null
  hasExperience?: boolean
  experienceSince?: string | null
  experienceRole?: string | null
  experienceEntity?: string | null
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
  const [sortColumn, setSortColumn] = useState<SortColumn>('startDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-0 group-hover:opacity-50" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 inline" />
      : <ArrowDown className="h-4 w-4 ml-1 inline" />
  }

  const filteredStarters = starters
    .filter(starter => {
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
    .sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'roleTitle':
          aValue = (a.roleTitle || '').toLowerCase()
          bValue = (b.roleTitle || '').toLowerCase()
          break
        case 'region':
          aValue = (a.region || '').toLowerCase()
          bValue = (b.region || '').toLowerCase()
          break
        case 'startDate':
          aValue = new Date(a.startDate).getTime()
          bValue = new Date(b.startDate).getTime()
          break
        case 'entity':
          aValue = (a.entity?.name || '').toLowerCase()
          bValue = (b.entity?.name || '').toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
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
    const csvData = filteredStarters.map(s => {
      let experienceText = 'Nee'
      if (s.hasExperience) {
        const parts: string[] = []
        if (s.experienceEntity || s.experienceRole) {
          parts.push(`${s.experienceEntity || ''}${s.experienceEntity && s.experienceRole ? ' - ' : ''}${s.experienceRole || ''}`)
        }
        if (s.experienceSince) {
          parts.push(getExperienceText(s.experienceSince))
        }
        experienceText = parts.length > 0 ? parts.join(' | ') : 'Ja'
      }
      
      return {
        Naam: s.name,
        Taal: s.language || 'NL',
        Functie: s.roleTitle || '',
        Regio: s.region || '',
        Ervaring: experienceText,
        Startdatum: new Date(s.startDate).toLocaleDateString('nl-BE'),
        Week: s.weekNumber || '',
        Entiteit: s.entity?.name || '',
      }
    })

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

  const exportPDF = () => {
    const doc = new jsPDF()
    
    // Titel
    doc.setFontSize(18)
    doc.text('Starters Overzicht', 14, 22)
    doc.setFontSize(11)
    doc.text(`Jaar: ${year}`, 14, 30)
    
    // Data voorbereiden
    const tableData = filteredStarters.map(s => {
      let experienceText = 'Nee'
      if (s.hasExperience) {
        const parts: string[] = []
        if (s.experienceEntity || s.experienceRole) {
          parts.push(`${s.experienceEntity || ''}${s.experienceEntity && s.experienceRole ? ' - ' : ''}${s.experienceRole || ''}`)
        }
        if (s.experienceSince) {
          parts.push(getExperienceText(s.experienceSince))
        }
        experienceText = parts.length > 0 ? parts.join(' | ') : 'Ja'
      }
      
      return [
        s.name,
        s.language || 'NL',
        s.roleTitle || '',
        s.region || '',
        experienceText,
        new Date(s.startDate).toLocaleDateString('nl-BE'),
        s.weekNumber?.toString() || '',
        s.entity?.name || '',
      ]
    })

    // Tabel maken
    autoTable(doc, {
      head: [['Naam', 'Taal', 'Functie', 'Regio', 'Ervaring', 'Startdatum', 'Week', 'Entiteit']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }, // Blauw
      columnStyles: {
        0: { cellWidth: 30 }, // Naam
        1: { cellWidth: 12 }, // Taal
        2: { cellWidth: 25 }, // Functie
        3: { cellWidth: 20 }, // Regio
        4: { cellWidth: 25 }, // Ervaring
        5: { cellWidth: 22 }, // Startdatum
        6: { cellWidth: 12 }, // Week
        7: { cellWidth: 25 }, // Entiteit
      },
    })

    // Download
    doc.save(`starters-${year}.pdf`)
  }

  const exportXLS = () => {
    const xlsData = filteredStarters.map(s => {
      let experienceText = 'Nee'
      if (s.hasExperience) {
        const parts: string[] = []
        if (s.experienceEntity || s.experienceRole) {
          parts.push(`${s.experienceEntity || ''}${s.experienceEntity && s.experienceRole ? ' - ' : ''}${s.experienceRole || ''}`)
        }
        if (s.experienceSince) {
          parts.push(getExperienceText(s.experienceSince))
        }
        experienceText = parts.length > 0 ? parts.join(' | ') : 'Ja'
      }
      
      return {
        'Naam': s.name,
        'Taal': s.language || 'NL',
        'Functie': s.roleTitle || '',
        'Regio': s.region || '',
        'Ervaring': experienceText,
        'Startdatum': new Date(s.startDate).toLocaleDateString('nl-BE'),
        'Week': s.weekNumber || '',
        'Entiteit': s.entity?.name || '',
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(xlsData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Naam
      { wch: 8 },  // Taal
      { wch: 20 }, // Functie
      { wch: 15 }, // Regio
      { wch: 25 }, // Ervaring
      { wch: 15 }, // Startdatum
      { wch: 10 }, // Week
      { wch: 20 }, // Entiteit
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Starters')

    // Download
    XLSX.writeFile(wb, `starters-${year}.xlsx`)
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

            <ExportDropdown
              onExportCSV={exportCSV}
              onExportPDF={exportPDF}
              onExportXLS={exportXLS}
            />

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
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    Naam {getSortIcon('name')}
                  </th>
                  <th className="pb-3 font-medium">Taal</th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('roleTitle')}
                  >
                    Functie {getSortIcon('roleTitle')}
                  </th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('region')}
                  >
                    Regio {getSortIcon('region')}
                  </th>
                  <th className="pb-3 font-medium">Ervaring</th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('startDate')}
                  >
                    Startdatum {getSortIcon('startDate')}
                  </th>
                  <th className="pb-3 font-medium">Week</th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('entity')}
                  >
                    Entiteit {getSortIcon('entity')}
                  </th>
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
                    <td className="py-3 text-sm">
                      {starter.hasExperience ? (
                        <div className="flex items-start gap-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked disabled className="pointer-events-none mt-0.5" />
                          <div className="flex flex-col">
                            {(starter.experienceEntity || starter.experienceRole) && (
                              <span className="text-xs font-medium">
                                {starter.experienceEntity || ''}
                                {starter.experienceEntity && starter.experienceRole ? ' - ' : ''}
                                {starter.experienceRole || ''}
                              </span>
                            )}
                            {starter.experienceSince && (
                              <span className="text-xs text-muted-foreground">
                                {getExperienceText(starter.experienceSince)}
                              </span>
                            )}
                            {!starter.experienceEntity && !starter.experienceRole && !starter.experienceSince && (
                              <span className="text-xs">Ja</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
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

