'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface AuditEntry {
  id: string
  action: string
  actor: { id: string | null; name: string }
  target: string | null
  meta: any
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export function AuditReportClient() {
  const t = useTranslations('recruitment.auditReport')
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [targetFilter, setTargetFilter] = useState('')

  const fetchReport = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (actionFilter) params.set('action', actionFilter)
    if (targetFilter) params.set('target', targetFilter)

    try {
      const res = await fetch(`/api/recruitment/admin/audit-report?${params}`)
      if (res.ok) {
        const json = await res.json()
        setEntries(json.data)
        setPagination(json.pagination)
      }
    } finally { setLoading(false) }
  }, [dateFrom, dateTo, actionFilter, targetFilter])

  useEffect(() => { fetchReport() }, [fetchReport])

  function handleExport() {
    const params = new URLSearchParams({ format: 'csv' })
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (actionFilter) params.set('action', actionFilter)
    if (targetFilter) params.set('target', targetFilter)
    window.open(`/api/recruitment/admin/audit-report?${params}`, '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">{t('from')}</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('to')}</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('action')}</label>
          <Input placeholder={t('actionPlaceholder')} value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-48" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t('target')}</label>
          <Input placeholder={t('targetPlaceholder')} value={targetFilter} onChange={e => setTargetFilter(e.target.value)} className="w-48" />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />{t('export')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{t('colTimestamp')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('colAction')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('colActor')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('colTarget')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: nl })}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                    </td>
                    <td className="px-3 py-2">{entry.actor.name}</td>
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-[200px]">{entry.target ?? '-'}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">{t('empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('showing', { from: (pagination.page - 1) * pagination.limit + 1, to: Math.min(pagination.page * pagination.limit, pagination.total), total: pagination.total })}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={pagination.page <= 1} onClick={() => fetchReport(pagination.page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={pagination.page >= pagination.pages} onClick={() => fetchReport(pagination.page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
