'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { useLocale } from 'next-intl'
import { getDateLocale } from '@/lib/date-locale'
import { Search, Plus, ArrowUpDown, ArrowUp, ArrowDown, PlaneLanding, PlaneTakeoff, ArrowLeftRight, Building2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StarterDialog } from '@/components/kalender/starter-dialog'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { getExperienceText } from '@/lib/experience-utils'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type SortColumn = 'name' | 'roleTitle' | 'region' | 'startDate' | 'entity'
type SortDirection = 'asc' | 'desc'
type StarterFilter = 'ALL' | 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  contractSignedOn?: string | null
  startDate: string
  weekNumber: number | null
  hasExperience?: boolean
  experienceSince?: string | null
  experienceRole?: string | null
  experienceEntity?: string | null
  phoneNumber?: string | null
  desiredEmail?: string | null
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
  const t = useTranslations('starters')
  const tc = useTranslations('common')
  const dateLocale = getDateLocale(useLocale())
  const today = new Date()
  const [periodMode, setPeriodMode] = useState<'year' | 'custom'>('year')
  const [year, setYear] = useState(initialYear)
  const [customFrom, setCustomFrom] = useState(() => format(today, 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(() => format(today, 'yyyy-MM-dd'))
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set())
  const [starterTypeFilter, setStarterTypeFilter] = useState<StarterFilter>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('startDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    setLoading(true)

    const yearsToFetch = new Set<number>()
    if (periodMode === 'custom') {
      const startYear = new Date(customFrom).getFullYear()
      const endYear = new Date(customTo).getFullYear()
      for (let y = startYear; y <= endYear; y++) yearsToFetch.add(y)
    } else {
      yearsToFetch.add(year)
    }

    const years = Array.from(yearsToFetch)

    Promise.all([
      Promise.all(years.map(y =>
        fetch(`/api/starters?year=${y}`).then(res => res.json())
      )).then(results => results.flat()),
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
  }, [year, periodMode, customFrom, customTo])

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
      if (starterTypeFilter !== 'ALL') {
        const type = starter.type || 'ONBOARDING'
        if (type !== starterTypeFilter) return false
      }

      if (periodMode === 'custom') {
        const starterDate = new Date(starter.startDate)
        const from = new Date(customFrom)
        const to = new Date(customTo)
        to.setHours(23, 59, 59, 999)
        if (starterDate < from || starterDate > to) return false
      }

      if (selectedEntities.size > 0 && (!starter.entity || !selectedEntities.has(starter.entity.id))) {
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
      const yearsToFetch = new Set<number>()
      if (periodMode === 'custom') {
        const startYear = new Date(customFrom).getFullYear()
        const endYear = new Date(customTo).getFullYear()
        for (let y = startYear; y <= endYear; y++) yearsToFetch.add(y)
      } else {
        yearsToFetch.add(year)
      }
      Promise.all(Array.from(yearsToFetch).map(y =>
        fetch(`/api/starters?year=${y}`).then(res => res.json())
      ))
        .then(results => setStarters(results.flat()))
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
        Email: s.desiredEmail || '',
        Telefoon: s.phoneNumber || '',
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
    doc.text(t('pdfTitle'), 14, 22)
    doc.setFontSize(11)
    doc.text(`Jaar: ${year}`, 14, 30)
    
    // Data voorbereiden
    const tableData = filteredStarters.map(s => {
      let experienceText = tc('no')
      if (s.hasExperience) {
        const parts: string[] = []
        if (s.experienceEntity || s.experienceRole) {
          parts.push(`${s.experienceEntity || ''}${s.experienceEntity && s.experienceRole ? ' - ' : ''}${s.experienceRole || ''}`)
        }
        if (s.experienceSince) {
          parts.push(getExperienceText(s.experienceSince))
        }
        experienceText = parts.length > 0 ? parts.join(' | ') : tc('yes')
      }
      
      return [
        s.name,
        s.desiredEmail || '',
        s.phoneNumber || '',
        s.language || 'NL',
        s.roleTitle || '',
        s.region || '',
        experienceText,
        new Date(s.startDate).toLocaleDateString('nl-BE'),
        s.weekNumber?.toString() || '',
        s.entity?.name || '',
      ]
    })

    autoTable(doc, {
      head: [[t('columnName'), t('columnEmail'), t('columnPhone'), t('columnLanguage'), t('columnRole'), t('columnRegion'), t('columnExperience'), t('columnStartDate'), t('columnWeek'), t('columnEntity')]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 25 }, // Naam
        1: { cellWidth: 30 }, // Email
        2: { cellWidth: 22 }, // Telefoon
        3: { cellWidth: 10 }, // Taal
        4: { cellWidth: 20 }, // Functie
        5: { cellWidth: 18 }, // Regio
        6: { cellWidth: 20 }, // Ervaring
        7: { cellWidth: 20 }, // Startdatum
        8: { cellWidth: 10 }, // Week
        9: { cellWidth: 20 }, // Entiteit
      },
    })

    // Download
    doc.save(`starters-${year}.pdf`)
  }

  const exportXLS = () => {
    const xlsData = filteredStarters.map(s => {
      let experienceText = tc('no')
      if (s.hasExperience) {
        const parts: string[] = []
        if (s.experienceEntity || s.experienceRole) {
          parts.push(`${s.experienceEntity || ''}${s.experienceEntity && s.experienceRole ? ' - ' : ''}${s.experienceRole || ''}`)
        }
        if (s.experienceSince) {
          parts.push(getExperienceText(s.experienceSince))
        }
        experienceText = parts.length > 0 ? parts.join(' | ') : tc('yes')
      }
      
      return {
        [t('columnName')]: s.name,
        [t('columnEmail')]: s.desiredEmail || '',
        [t('columnPhone')]: s.phoneNumber || '',
        [t('columnLanguage')]: s.language || 'NL',
        [t('columnRole')]: s.roleTitle || '',
        [t('columnRegion')]: s.region || '',
        [t('columnExperience')]: experienceText,
        [t('columnStartDate')]: new Date(s.startDate).toLocaleDateString('nl-BE'),
        [t('columnWeek')]: s.weekNumber || '',
        [t('columnEntity')]: s.entity?.name || '',
      }
    })

    const ws = XLSX.utils.json_to_sheet(xlsData)
    
    ws['!cols'] = [
      { wch: 25 }, // Naam
      { wch: 30 }, // Email
      { wch: 18 }, // Telefoon
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
    XLSX.utils.book_append_sheet(wb, ws, t('sheetName'))

    // Download
    XLSX.writeFile(wb, `starters-${year}.xlsx`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>
            {periodMode === 'custom'
              ? t('cardTitleCustom')
              : t('cardTitle', { year })}
          </CardTitle>
          <div className="flex gap-2 flex-wrap items-center">
            <Select value={periodMode} onValueChange={(v: 'year' | 'custom') => setPeriodMode(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">{t('periodYear')}</SelectItem>
                <SelectItem value="custom">{t('periodCustom')}</SelectItem>
              </SelectContent>
            </Select>

            {periodMode === 'year' ? (
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
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-[150px]"
                />
                <span className="text-muted-foreground text-sm">—</span>
                <Input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-[150px]"
                />
              </div>
            )}
            
            <Select value={starterTypeFilter} onValueChange={(v: StarterFilter) => setStarterTypeFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filterAll')}</SelectItem>
                <SelectItem value="ONBOARDING">{t('filterArrivals')}</SelectItem>
                <SelectItem value="OFFBOARDING">{t('filterDepartures')}</SelectItem>
                <SelectItem value="MIGRATION">{t('filterMigrations')}</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start font-normal">
                  <Building2 className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">
                    {selectedEntities.size === 0
                      ? t('allEntities')
                      : selectedEntities.size === 1
                        ? entities.find(e => selectedEntities.has(e.id))?.name
                        : t('entitiesSelected', { count: selectedEntities.size })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start">
                <div className="space-y-1">
                  <button
                    className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => setSelectedEntities(new Set())}
                  >
                    <Checkbox
                      checked={selectedEntities.size === 0}
                      className="pointer-events-none"
                    />
                    {t('allEntities')}
                  </button>
                  {entities.map(entity => (
                    <button
                      key={entity.id}
                      className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        setSelectedEntities(prev => {
                          const next = new Set(prev)
                          if (next.has(entity.id)) {
                            next.delete(entity.id)
                          } else {
                            next.add(entity.id)
                          }
                          return next
                        })
                      }}
                    >
                      <Checkbox
                        checked={selectedEntities.has(entity.id)}
                        className="pointer-events-none"
                      />
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entity.colorHex }}
                      />
                      {entity.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <ExportDropdown
              onExportCSV={exportCSV}
              onExportPDF={exportPDF}
              onExportXLS={exportXLS}
            />

            {canEdit && (
              <Button onClick={() => { setSelectedStarter(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {t('newStarter')}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
        ) : filteredStarters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t('noStarters')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium w-[60px]">{t('columnType')}</th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    {t('columnName')} {getSortIcon('name')}
                  </th>
                  <th className="pb-3 font-medium">{t('columnLanguage')}</th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('roleTitle')}
                  >
                    {t('columnRole')} {getSortIcon('roleTitle')}
                  </th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('region')}
                  >
                    {t('columnRegion')} {getSortIcon('region')}
                  </th>
                  <th className="pb-3 font-medium">{t('columnExperience')}</th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('startDate')}
                  >
                    {t('columnDate')} {getSortIcon('startDate')}
                  </th>
                  <th className="pb-3 font-medium">{t('columnWeek')}</th>
                  <th 
                    className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors group"
                    onClick={() => handleSort('entity')}
                  >
                    {t('columnEntity')} {getSortIcon('entity')}
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
                    <td className="py-3 text-sm">
                      <span title={starter.type === 'MIGRATION' ? tc('migration') : starter.type === 'OFFBOARDING' ? tc('offboarding') : tc('onboarding')}>
                        {starter.type === 'MIGRATION' ? (
                          <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                        ) : starter.type === 'OFFBOARDING' ? (
                          <PlaneTakeoff className="h-4 w-4 text-red-500" />
                        ) : (
                          <PlaneLanding className="h-4 w-4 text-green-500" />
                        )}
                      </span>
                    </td>
                    <td className="py-3 font-medium">{starter.name}</td>
                    <td className="py-3 text-sm">
                      <span title={starter.language === 'NL' ? t('languageNL') : t('languageFR')}>
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
                              <span className="text-xs">{tc('yes')}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 text-sm">
                      {format(new Date(starter.startDate), 'dd MMM yyyy', { locale: dateLocale })}
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
          {t('resultCount', { count: filteredStarters.length })}
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

