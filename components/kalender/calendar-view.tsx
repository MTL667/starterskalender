'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, Plus, Search, Calendar, Building2, Clock } from 'lucide-react'
import { StarterCard } from './starter-card'
import { StarterDialog } from './starter-dialog'
import { getWeeksInYear } from '@/lib/week-utils'
import { Badge } from '@/components/ui/badge'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getWeek, getMonth, getYear, addWeeks, addMonths, addYears, format } from 'date-fns'
import { useLocale } from 'next-intl'
import { getDateLocale } from '@/lib/date-locale'
import { useSession } from 'next-auth/react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { Starter, StarterFilter, EntityRef } from '@/lib/types'

type ViewMode = 'week' | 'month' | 'year' | 'custom'

export function CalendarView({ initialYear, canEdit }: { initialYear: number; canEdit: boolean }) {
  const t = useTranslations('calendar')
  const dateLocale = getDateLocale(useLocale())
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'HR_ADMIN'
  const searchParams = useSearchParams()
  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(today)
  const [year, setYear] = useState(initialYear)
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<EntityRef[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set())
  const [starterTypeFilter, setStarterTypeFilter] = useState<StarterFilter>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)
  const [deepLinkHandled, setDeepLinkHandled] = useState(false)
  const [customFrom, setCustomFrom] = useState(() => format(today, 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(() => format(today, 'yyyy-MM-dd'))

  const weeksInYear = getWeeksInYear(year)

  const fetchYear = viewMode === 'year' ? year : viewMode === 'custom' ? getYear(new Date(customFrom)) : getYear(currentDate)

  useEffect(() => {
    if (viewMode !== 'year' && viewMode !== 'custom') {
      const currentYear = getYear(currentDate)
      if (currentYear !== year) {
        setYear(currentYear)
      }
    }
  }, [currentDate, viewMode, year])

  useEffect(() => {
    setLoading(true)
    
    const yearsToFetch = new Set<number>([fetchYear])
    
    if (viewMode === 'custom') {
      const startYear = getYear(new Date(customFrom))
      const endYear = getYear(new Date(customTo))
      for (let y = startYear; y <= endYear; y++) {
        yearsToFetch.add(y)
      }
    } else if (viewMode !== 'year') {
      const rangeStart = viewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfMonth(currentDate)
      const rangeEnd = viewMode === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfMonth(currentDate)
      
      yearsToFetch.add(getYear(rangeStart))
      yearsToFetch.add(getYear(rangeEnd))
    }
    
    const years = Array.from(yearsToFetch)
    
    Promise.all([
      Promise.all(years.map(y => 
        fetch(`/api/starters?year=${y}&includePending=true`).then(res => res.json())
      )).then(results => {
        const seen = new Set<string>()
        return results.flat().filter((s: Starter) => {
          if (seen.has(s.id)) return false
          seen.add(s.id)
          return true
        })
      }),
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
  }, [fetchYear, currentDate, viewMode, customFrom, customTo])

  // Deep-link: open starter dialog when starterId is in URL
  useEffect(() => {
    if (deepLinkHandled || loading || starters.length === 0) return
    const starterId = searchParams.get('starterId')
    if (!starterId) return
    
    const found = starters.find(s => s.id === starterId)
    if (found) {
      setSelectedStarter(found)
      setDialogOpen(true)
      if (found.startDate) {
        const starterDate = new Date(found.startDate)
        setCurrentDate(starterDate)
      }
    } else {
      fetch(`/api/starters/${starterId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setSelectedStarter(data)
            setDialogOpen(true)
            if (data.startDate) {
              const starterDate = new Date(data.startDate)
              setCurrentDate(starterDate)
              setYear(getYear(starterDate))
            }
          }
        })
        .catch(() => {})
    }
    setDeepLinkHandled(true)
  }, [deepLinkHandled, loading, starters, searchParams])

  let dateRangeStart: Date, dateRangeEnd: Date
  if (viewMode === 'week') {
    dateRangeStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    dateRangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  } else if (viewMode === 'month') {
    dateRangeStart = startOfMonth(currentDate)
    dateRangeEnd = endOfMonth(currentDate)
  } else if (viewMode === 'custom') {
    dateRangeStart = new Date(customFrom)
    const end = new Date(customTo)
    end.setHours(23, 59, 59, 999)
    dateRangeEnd = end
  } else {
    dateRangeStart = startOfYear(new Date(year, 0, 1))
    dateRangeEnd = endOfYear(new Date(year, 0, 1))
  }

  // Separate pending boarding starters
  const pendingBoardingStarters = starters.filter(starter => {
    if (!starter.isPendingBoarding) return false
    if (selectedEntities.size > 0 && (!starter.entity || !selectedEntities.has(starter.entity.id))) return false
    if (starterTypeFilter !== 'ALL') {
      const type = starter.type || 'ONBOARDING'
      if (type !== starterTypeFilter) return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        `${starter.firstName} ${starter.lastName}`.toLowerCase().includes(query) ||
        starter.roleTitle?.toLowerCase().includes(query) ||
        starter.region?.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Filter starters (excluding pending boarding)
  const filteredStarters = starters.filter(starter => {
    if (starter.isPendingBoarding) return false

    if (starterTypeFilter !== 'ALL') {
      const type = starter.type || 'ONBOARDING'
      if (type !== starterTypeFilter) return false
    }

    if (viewMode !== 'year') {
      if (!starter.startDate) return false
      const starterDate = new Date(starter.startDate)
      if (starterDate < dateRangeStart || starterDate > dateRangeEnd) {
        return false
      }
    }

    if (selectedEntities.size > 0 && (!starter.entity || !selectedEntities.has(starter.entity.id))) {
      return false
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        `${starter.firstName} ${starter.lastName}`.toLowerCase().includes(query) ||
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
      fetch(`/api/starters?year=${fetchYear}&includePending=true`)
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
      // Year wordt automatisch gesynchroniseerd door useEffect
    }
  }

  const getPeriodLabel = () => {
    if (viewMode === 'week') {
      const monday = startOfWeek(currentDate, { weekStartsOn: 1 })
      const sunday = endOfWeek(currentDate, { weekStartsOn: 1 })
      const mondayYear = getYear(monday)
      const sundayYear = getYear(sunday)
      if (mondayYear === sundayYear) {
        return `${format(monday, 'd MMMM', { locale: dateLocale })} - ${format(sunday, 'd MMMM yyyy', { locale: dateLocale })}`
      } else {
        return `${format(monday, 'd MMMM yyyy', { locale: dateLocale })} - ${format(sunday, 'd MMMM yyyy', { locale: dateLocale })}`
      }
    } else if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: dateLocale })
    } else if (viewMode === 'custom') {
      return `${format(new Date(customFrom), 'd MMM yyyy', { locale: dateLocale })} - ${format(new Date(customTo), 'd MMM yyyy', { locale: dateLocale })}`
    } else {
      return year.toString()
    }
  }

  const exportCSV = async () => {
    const csvData = filteredStarters.map(s => ({
      [t('exportFirstName')]: s.firstName,
      [t('exportLastName')]: s.lastName,
      [t('exportRole')]: s.roleTitle || '',
      [t('exportRegion')]: s.region || '',
      [t('exportStartDate')]: s.startDate ? new Date(s.startDate).toLocaleDateString('nl-BE') : 'Pending',
      [t('exportWeek')]: s.weekNumber || '',
      [t('exportEntity')]: s.entity?.name || '',
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
    a.download = `starters-kalender-${year}.csv`
    a.click()
  }

  const exportPDF = async () => {
    const doc = new jsPDF()
    
    // Titel
    doc.setFontSize(18)
    doc.text('Starterskalender', 14, 22)
    doc.setFontSize(11)
    doc.text(`Jaar: ${year}`, 14, 30)
    
    // Data voorbereiden
    const tableData = filteredStarters.map(s => [
      s.firstName,
      s.lastName,
      s.roleTitle || '',
      s.region || '',
      s.startDate ? new Date(s.startDate).toLocaleDateString('nl-BE') : 'Pending',
      s.weekNumber?.toString() || '',
      s.entity?.name || '',
    ])

    // Tabel maken
    autoTable(doc, {
      head: [[t('exportFirstName'), t('exportLastName'), 'Functie', 'Regio', 'Startdatum', 'Week', 'Entiteit']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }, // Blauw
    })

    // Download
    doc.save(`starters-kalender-${year}.pdf`)
  }

  const exportXLS = async () => {
    const xlsData = filteredStarters.map(s => ({
      [t('exportFirstName')]: s.firstName,
      [t('exportLastName')]: s.lastName,
      'Functie': s.roleTitle || '',
      'Regio': s.region || '',
      'Startdatum': s.startDate ? new Date(s.startDate).toLocaleDateString('nl-BE') : 'Pending',
      'Week': s.weekNumber || '',
      'Entiteit': s.entity?.name || '',
    }))

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(xlsData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 18 }, // Voornaam
      { wch: 22 }, // Achternaam
      { wch: 20 }, // Functie
      { wch: 15 }, // Regio
      { wch: 15 }, // Startdatum
      { wch: 10 }, // Week
      { wch: 20 }, // Entiteit
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Starters')

    // Download
    XLSX.writeFile(wb, `starters-kalender-${year}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Filters en acties */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('viewWeek')}</SelectItem>
                  <SelectItem value="month">{t('viewMonth')}</SelectItem>
                  <SelectItem value="year">{t('viewYear')}</SelectItem>
                  <SelectItem value="custom">{t('viewCustom')}</SelectItem>
                </SelectContent>
              </Select>

              {viewMode === 'custom' ? (
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
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={handlePrevious}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold text-base min-w-[180px] text-center px-2">
                      {getPeriodLabel()}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button variant="outline" onClick={handleToday}>
                    {t('today')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Zoeken en filters */}
          <div className="flex flex-col sm:flex-row gap-2">

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

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

            {canEdit && (
              <Button onClick={handleNewStarter}>
                <Plus className="h-4 w-4 mr-2" />
                {t('new')}
              </Button>
            )}
            <ExportDropdown
              onExportCSV={exportCSV}
              onExportPDF={exportPDF}
              onExportXLS={exportXLS}
            />
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
          {t('loading')}
        </div>
      ) : viewMode === 'year' ? (
        // Jaar view: toon alle weken
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: weeksInYear }, (_, i) => i + 1).map(weekNum => {
            const weekStarters = startersByWeek.get(weekNum) || []
            
            return (
              <Card key={weekNum} className="p-4">
                <div className="font-semibold mb-3 text-sm text-muted-foreground">
                  {t('weekLabel', { number: weekNum })}
                </div>
                <div className="space-y-3">
                  {weekStarters.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      {t('noStarters')}
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
        <div className="space-y-4">
          {filteredStarters.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                {viewMode === 'custom'
                  ? t('noStartersPeriod', { period: t('periodCustom') })
                  : t('noStartersPeriod', { period: viewMode === 'week' ? t('periodWeek') : t('periodMonth') })}
              </div>
            </Card>
          ) : (
            // Groepeer per datum
            (() => {
              const startersByDate = new Map<string, Starter[]>()
              filteredStarters.filter(s => s.startDate).forEach(starter => {
                const dateKey = format(new Date(starter.startDate!), 'yyyy-MM-dd')
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
                      {format(date, 'EEEE d MMMM yyyy', { locale: dateLocale })}
                      <span className="text-sm text-muted-foreground ml-2">
                        ({t('weekLabel', { number: getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 }) })}
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

      {/* Pending Boarding Section - HR_ADMIN only */}
      {isAdmin && pendingBoardingStarters.length > 0 && (
        <Card className="p-4 border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-base">{t('pendingBoardingTitle')}</h3>
            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600">
              {pendingBoardingStarters.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('pendingBoardingDescription')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingBoardingStarters.map(starter => (
              <div
                key={starter.id}
                onClick={() => handleStarterClick(starter)}
                className="border border-amber-200 dark:border-amber-700 rounded-lg p-3 cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-colors bg-card"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <div className="font-medium text-sm truncate">{starter.firstName} {starter.lastName}</div>
                    {starter.language && (
                      <span className="text-xs shrink-0">{starter.language === 'NL' ? '🇳🇱' : '🇫🇷'}</span>
                    )}
                  </div>
                  {starter.entity && (
                    <Badge className="text-xs shrink-0" style={{ backgroundColor: starter.entity.colorHex, color: 'white' }}>
                      {starter.entity.name}
                    </Badge>
                  )}
                </div>
                {starter.roleTitle && (
                  <div className="text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{t('role')}</span> {starter.roleTitle}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <Clock className="h-3 w-3" />
                  {t('pendingBoardingLabel')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Totaal */}
      <div className="text-center text-sm text-muted-foreground">
        {t('resultCount', {
          count: filteredStarters.length + pendingBoardingStarters.length,
          period: viewMode === 'custom'
            ? t('periodCustomRange')
            : viewMode === 'week' ? t('periodThisWeek') : viewMode === 'month' ? t('periodThisMonth') : t('periodInYear', { year })
        })}
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

