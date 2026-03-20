'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, Search, X, ChevronDown, ChevronUp, Download, File, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'CANCEL_STARTER',
  'EMAIL_SENT',
  'EMAIL_FAILED',
  'SEND_MAIL',
  'LOGIN',
  'LOGOUT',
  'INVITE_SENT',
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_CANCELLED',
  'ROOM_CREATED',
  'ROOM_UPDATED',
  'ROOM_DELETED',
] as const

interface AuditLogEntry {
  id: string
  actorId: string | null
  actor: { name: string | null; email: string } | null
  action: string
  target: string | null
  meta: Record<string, any> | null
  createdAt: string
}

interface AuditResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  totalPages: number
}

function getActionBadgeColor(action: string) {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-800'
    case 'UPDATE':
      return 'bg-blue-100 text-blue-800'
    case 'DELETE':
      return 'bg-red-100 text-red-800'
    case 'CANCEL_STARTER':
      return 'bg-orange-100 text-orange-800'
    case 'EMAIL_SENT':
    case 'SEND_MAIL':
      return 'bg-purple-100 text-purple-800'
    case 'EMAIL_FAILED':
      return 'bg-red-100 text-red-800'
    case 'INVITE_SENT':
      return 'bg-indigo-100 text-indigo-800'
    case 'LOGIN':
    case 'LOGOUT':
      return 'bg-gray-100 text-gray-800'
    case 'BOOKING_CREATED':
    case 'BOOKING_UPDATED':
    case 'BOOKING_CANCELLED':
    case 'ROOM_CREATED':
    case 'ROOM_UPDATED':
    case 'ROOM_DELETED':
      return 'bg-teal-100 text-teal-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function AuditLogPage() {
  const t = useTranslations('adminAuditLog')
  const tc = useTranslations('common')
  const te = useTranslations('export')

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', p.toString())
      params.set('limit', '50')
      if (actionFilter !== 'ALL') params.set('action', actionFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (res.ok) {
        const data: AuditResponse = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }, [actionFilter, searchQuery, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchLogs(newPage)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setActionFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = searchQuery || actionFilter !== 'ALL' || dateFrom || dateTo

  const getActorDisplay = (log: AuditLogEntry) => {
    if (!log.actorId) return t('systemActor')
    if (!log.actor) return t('unknownActor')
    return log.actor.name || log.actor.email
  }

  const getActorEmail = (log: AuditLogEntry) => {
    if (!log.actorId || !log.actor) return null
    return log.actor.email
  }

  const getActionLabel = (action: string) => {
    const key = `action${action}` as any
    try {
      return t(key)
    } catch {
      return action
    }
  }

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('nl-BE', {
      dateStyle: 'short',
      timeStyle: 'medium',
    })
  }

  const fetchAllForExport = async (): Promise<AuditLogEntry[]> => {
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('limit', '10000')
    if (actionFilter !== 'ALL') params.set('action', actionFilter)
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)

    const res = await fetch(`/api/admin/audit-logs?${params}`)
    if (res.ok) {
      const data: AuditResponse = await res.json()
      return data.logs
    }
    return []
  }

  const mapLogsToRows = (exportLogs: AuditLogEntry[]) =>
    exportLogs.map(log => ({
      [t('columnTimestamp')]: formatTimestamp(log.createdAt),
      [t('columnUser')]: getActorDisplay(log),
      'E-mail': getActorEmail(log) || '',
      [t('columnAction')]: getActionLabel(log.action),
      [t('columnTarget')]: log.target || '',
      [t('columnDetails')]: log.meta ? JSON.stringify(log.meta) : '',
    }))

  const exportCSV = async () => {
    const exportLogs = await fetchAllForExport()
    const rows = mapLogsToRows(exportLogs)
    if (rows.length === 0) return

    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${t('exportFileName')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportXLS = async () => {
    const exportLogs = await fetchAllForExport()
    const rows = mapLogsToRows(exportLogs)
    if (rows.length === 0) return

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 30 },
      { wch: 18 },
      { wch: 30 },
      { wch: 50 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log')
    XLSX.writeFile(wb, `${t('exportFileName')}.xlsx`)
  }

  const renderMetaDetails = (meta: Record<string, any> | null) => {
    if (!meta || Object.keys(meta).length === 0) {
      return <p className="text-sm text-muted-foreground">{t('noMeta')}</p>
    }

    return (
      <div className="grid gap-1">
        {Object.entries(meta).map(([key, value]) => (
          <div key={key} className="flex gap-2 text-sm">
            <span className="font-medium text-muted-foreground min-w-[120px]">{key}:</span>
            <span className="break-all">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('backToAdmin')}
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('subtitle')}</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {te('button')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCSV}>
                  <File className="h-4 w-4 mr-2" />
                  {te('csv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportXLS}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {te('excel')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allActions')}</SelectItem>
                  {AUDIT_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {getActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex gap-3 flex-1">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">{t('dateFrom')}</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">{t('dateTo')}</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  {t('clearFilters')}
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{tc('loading')}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {hasActiveFilters ? t('noLogsFiltered') : t('noLogs')}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {t('showingCount', { count: logs.length, total })}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">{t('columnTimestamp')}</th>
                      <th className="pb-3 font-medium">{t('columnUser')}</th>
                      <th className="pb-3 font-medium">{t('columnAction')}</th>
                      <th className="pb-3 font-medium">{t('columnTarget')}</th>
                      <th className="pb-3 font-medium w-[80px]">{t('columnDetails')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <Fragment key={log.id}>
                        <tr
                          className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        >
                          <td className="py-3 text-sm whitespace-nowrap">
                            {formatTimestamp(log.createdAt)}
                          </td>
                          <td className="py-3">
                            <div>
                              <p className="text-sm font-medium">{getActorDisplay(log)}</p>
                              {getActorEmail(log) && getActorDisplay(log) !== getActorEmail(log) && (
                                <p className="text-xs text-muted-foreground">{getActorEmail(log)}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge className={getActionBadgeColor(log.action)}>
                              {getActionLabel(log.action)}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm max-w-[250px] truncate" title={log.target || ''}>
                            {log.target || '-'}
                          </td>
                          <td className="py-3 text-center">
                            {log.meta && Object.keys(log.meta).length > 0 ? (
                              expandedRow === log.id ? (
                                <ChevronUp className="h-4 w-4 inline text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 inline text-muted-foreground" />
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                        {expandedRow === log.id && (
                          <tr key={`${log.id}-detail`} className="border-b bg-muted/30">
                            <td colSpan={5} className="py-4 px-6">
                              <p className="text-sm font-medium mb-2">{t('metaTitle')}</p>
                              {renderMetaDetails(log.meta)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    {t('page', { page, totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      {t('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
