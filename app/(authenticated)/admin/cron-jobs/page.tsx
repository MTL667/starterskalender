'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, Send, Loader2, Info, Search } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'

interface JobResult {
  success: boolean
  message: string
  emailsSent?: number
  usersNotified?: string[]
  error?: string
  debugInfo?: string
}

interface EmailLog {
  id: string
  recipient: string
  subject: string
  startersCount: number | null
  entities: string[]
  status: string
  errorMessage: string | null
  sentAt: string
}

interface RecipientPreview {
  email: string
  name: string | null
  startersCount: number
  entities: string[]
  hasMatch: boolean
}

const cronJobConfigs = [
  { id: 'weekly', nameKey: 'weeklyReminder' as const, descKey: 'weeklySchedule' as const, scheduleKey: 'dailyAt' as const, endpoint: '/api/cron/send-weekly-reminders', icon: '📅' },
  { id: 'monthly', nameKey: 'monthlySummary' as const, descKey: 'monthlySchedule' as const, scheduleKey: 'firstOfMonth' as const, endpoint: '/api/cron/send-monthly-summary', icon: '📊' },
  { id: 'quarterly', nameKey: 'quarterlySummary' as const, descKey: 'quarterlySchedule' as const, scheduleKey: 'firstOfQuarter' as const, endpoint: '/api/cron/send-quarterly-summary', icon: '📈' },
  { id: 'yearly', nameKey: 'yearlySummary' as const, descKey: 'yearlySchedule' as const, scheduleKey: 'firstOfYear' as const, endpoint: '/api/cron/send-yearly-summary', icon: '🎉' },
] as const

type CronJobConfig = (typeof cronJobConfigs)[number]

function RecipientSelector({
  jobId,
  recipients,
  selectedRecipients,
  searchQuery,
  onSearchChange,
  onToggle,
  onSelectAll,
  t,
  tc,
}: {
  jobId: string
  recipients: RecipientPreview[]
  selectedRecipients: Set<string>
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggle: (jobId: string, email: string) => void
  onSelectAll: (jobId: string, selectAll: boolean) => void
  t: ReturnType<typeof useTranslations>
  tc: ReturnType<typeof useTranslations>
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return recipients
    const q = searchQuery.toLowerCase()
    return recipients.filter(r =>
      r.email.toLowerCase().includes(q) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      r.entities.some(e => e.toLowerCase().includes(q))
    )
  }, [recipients, searchQuery])

  const matchingCount = recipients.filter(r => r.hasMatch).length

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {t('selectRecipientsCount', { count: selectedRecipients.size })}
        </h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSelectAll(jobId, true)}
            className="h-7 text-xs"
          >
            {tc('all')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSelectAll(jobId, false)}
            className="h-7 text-xs"
          >
            {tc('none')}
          </Button>
        </div>
      </div>

      {recipients.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('searchRecipients')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      {matchingCount > 0 && matchingCount < recipients.length && (
        <p className="text-xs text-muted-foreground">
          {t('matchingRecipientsInfo', { matching: matchingCount, total: recipients.length })}
        </p>
      )}

      <div className="max-h-72 overflow-y-auto space-y-0.5">
        {filtered.map((recipient) => {
          const isSelected = selectedRecipients.has(recipient.email)

          return (
            <label
              key={recipient.email}
              className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                recipient.hasMatch
                  ? 'hover:bg-accent'
                  : 'hover:bg-accent opacity-60'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(jobId, recipient.email)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {recipient.name || recipient.email}
                  </span>
                  {recipient.hasMatch && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                      {t('wouldReceive')}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {recipient.email !== recipient.name && (
                    <span className="block truncate">{recipient.email}</span>
                  )}
                  {recipient.startersCount > 0
                    ? (recipient.startersCount === 1 ? t('starterCount', { count: recipient.startersCount }) : t('starterCountPlural', { count: recipient.startersCount }))
                    : t('noStartersInPeriod')
                  }
                  {recipient.entities.length > 0 && (
                    <span> • {recipient.entities.join(', ')}</span>
                  )}
                </div>
              </div>
            </label>
          )
        })}
        {filtered.length === 0 && searchQuery && (
          <p className="text-xs text-muted-foreground text-center py-3">{t('noSearchResults')}</p>
        )}
      </div>
    </div>
  )
}

export default function CronJobsPage() {
  const t = useTranslations('adminCronJobs')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, JobResult>>({})
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(true)
  const [emailLogs, setEmailLogs] = useState<Record<string, EmailLog[]>>({})
  const [logsLoading, setLogsLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [recipientPreviews, setRecipientPreviews] = useState<Record<string, RecipientPreview[]>>({})
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, Set<string>>>({})
  const [showRecipients, setShowRecipients] = useState<Record<string, boolean>>({})
  const [recipientSearch, setRecipientSearch] = useState<Record<string, string>>({})

  // Load diagnostics on mount
  useEffect(() => {
    fetch('/api/admin/cron-diagnostics')
      .then(res => res.json())
      .then(data => {
        setDiagnostics(data)
        setDiagnosticsLoading(false)
      })
      .catch(error => {
        console.error('Error loading diagnostics:', error)
        setDiagnosticsLoading(false)
      })
  }, [])

  // Load email logs on mount
  useEffect(() => {
    fetch('/api/admin/email-logs')
      .then(res => res.json())
      .then(data => {
        setEmailLogs(data)
        setLogsLoading(false)
      })
      .catch(error => {
        console.error('Error loading email logs:', error)
        setLogsLoading(false)
      })
  }, [])

  const previewRecipients = async (job: CronJobConfig) => {
    setPreviewLoading(job.id)

    try {
      const response = await fetch('/api/admin/cron-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: job.endpoint }),
      })

      const data = await response.json()

      if (response.ok) {
        setRecipientPreviews(prev => ({ ...prev, [job.id]: data.recipients }))
        
        // Standaard alleen matching recipients selecteren
        const matchingEmails = new Set<string>(
          data.recipients
            .filter((r: RecipientPreview) => r.hasMatch)
            .map((r: RecipientPreview) => r.email)
        )
        setSelectedRecipients(prev => ({ ...prev, [job.id]: matchingEmails }))
        
        // Toon recipient lijst
        setShowRecipients(prev => ({ ...prev, [job.id]: true }))
      } else {
        alert(`Fout bij ophalen ontvangers: ${data.error}`)
      }
    } catch (error) {
      console.error('Error previewing recipients:', error)
      alert('Fout bij ophalen ontvangers')
    } finally {
      setPreviewLoading(null)
    }
  }

  const toggleRecipient = (jobId: string, email: string) => {
    setSelectedRecipients(prev => {
      const current = prev[jobId] || new Set()
      const updated = new Set(current)
      
      if (updated.has(email)) {
        updated.delete(email)
      } else {
        updated.add(email)
      }
      
      return { ...prev, [jobId]: updated }
    })
  }

  const selectAllRecipients = (jobId: string, selectAll: boolean) => {
    setSelectedRecipients(prev => {
      const preview = recipientPreviews[jobId] || []
      const updated = selectAll 
        ? new Set(preview.map(r => r.email))
        : new Set<string>()
      
      return { ...prev, [jobId]: updated }
    })
  }

  const triggerJob = async (job: CronJobConfig) => {
    setLoading(job.id)
    setResults(prev => ({ ...prev, [job.id]: { success: false, message: t('sendingInProgress') } }))

    try {
      // Haal geselecteerde recipients op (indien preview gedaan is)
      const selected = selectedRecipients[job.id]
      const recipientsArray = selected ? Array.from(selected) : []

      const response = await fetch(`/api/admin/trigger-cron`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          endpoint: job.endpoint,
          recipients: recipientsArray.length > 0 ? recipientsArray : undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResults(prev => ({
          ...prev,
          [job.id]: {
            success: true,
            message: data.message || t('emailsSentSuccess'),
            emailsSent: data.emailsSent,
            usersNotified: data.usersNotified,
          },
        }))
        
        // Refresh email logs na succesvolle verzending
        fetch('/api/admin/email-logs')
          .then(res => res.json())
          .then(data => setEmailLogs(data))
          .catch(err => console.error('Error refreshing logs:', err))
      } else {
        // Enhanced error display
        const errorMessage = data.error || t('unknownError')
        const errorDetails = data.details || data.message || ''
        const debugInfo = data.debugInfo ? JSON.stringify(data.debugInfo, null, 2) : ''
        
        setResults(prev => ({
          ...prev,
          [job.id]: {
            success: false,
            message: errorMessage,
            error: errorDetails,
            debugInfo,
          },
        }))
      }
    } catch (error) {
      console.error('Error triggering cron job:', error)
      setResults(prev => ({
        ...prev,
        [job.id]: {
          success: false,
          message: t('errorSending'),
          error: error instanceof Error ? error.message : t('unknownError'),
        },
      }))
    } finally {
      setLoading(null)
    }
  }

  const getJobEmailLogs = (jobId: string): EmailLog[] => {
    const typeMap: Record<string, string> = {
      weekly: 'WEEKLY_REMINDER',
      monthly: 'MONTHLY_SUMMARY',
      quarterly: 'QUARTERLY_SUMMARY',
      yearly: 'YEARLY_SUMMARY',
    }
    const type = typeMap[jobId]
    return type ? emailLogs[type] || [] : []
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return t('timeNow')
    if (diffMins < 60) return t('timeMinutesAgo', { n: diffMins })
    if (diffHours < 24) return t('timeHoursAgo', { n: diffHours })
    if (diffDays < 7) return t('timeDaysAgo', { n: diffDays })
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Diagnostics Alert */}
      {!diagnosticsLoading && diagnostics && diagnostics.recommendations && (
        <Alert variant={diagnostics.recommendations[0].startsWith('✅') ? 'default' : 'destructive'}>
          <Info className="h-4 w-4" />
          <AlertTitle>{t('configStatus')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {diagnostics.recommendations.map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
            {!diagnostics.environment.cronSecret.configured && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-1">{t('howToFix')}</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>{t('generateCronSecret')} <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</code></li>
                  <li>{t('addToEasypanel')}</li>
                  <li>{t('rebuildApp')}</li>
                </ol>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('warning')}</AlertTitle>
        <AlertDescription>
          {t('realEmailsWarning')}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {cronJobConfigs.map(job => {
          const result = results[job.id]
          const isLoading = loading === job.id

          return (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <span>{job.icon}</span>
                      {t(job.nameKey)}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {t(job.descKey)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{t(job.scheduleKey)}</span>
                </div>

                {/* Preview Recipients Button */}
                <Button
                  onClick={() => previewRecipients(job)}
                  disabled={previewLoading === job.id || isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {previewLoading === job.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('fetchingRecipients')}
                    </>
                  ) : (
                    <>
                      👥 {t('showRecipients')}
                      {recipientPreviews[job.id]?.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {recipientPreviews[job.id].length}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>

                {/* Recipient Selection */}
                {showRecipients[job.id] && recipientPreviews[job.id] && (
                  <RecipientSelector
                    jobId={job.id}
                    recipients={recipientPreviews[job.id]}
                    selectedRecipients={selectedRecipients[job.id] || new Set()}
                    searchQuery={recipientSearch[job.id] || ''}
                    onSearchChange={(query) => setRecipientSearch(prev => ({ ...prev, [job.id]: query }))}
                    onToggle={toggleRecipient}
                    onSelectAll={selectAllRecipients}
                    t={t}
                    tc={tc}
                  />
                )}

                <Button
                  onClick={() => triggerJob(job)}
                  disabled={isLoading || (showRecipients[job.id] && (selectedRecipients[job.id]?.size || 0) === 0)}
                  className="w-full"
                  variant={result?.success ? 'outline' : 'default'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('sendingInProgress')}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {showRecipients[job.id] && (selectedRecipients[job.id]?.size || 0) > 0
                        ? `${t('sendTo')} ${selectedRecipients[job.id]?.size} ${t('recipients')}`
                        : t('sendNow')}
                    </>
                  )}
                </Button>

                {/* Email Logs - Laatste verzendingen */}
                {!logsLoading && getJobEmailLogs(job.id).length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                      📧 {t('recentSends')}
                    </h4>
                    <div className="space-y-2">
                      {getJobEmailLogs(job.id).slice(0, 3).map((log) => {
                        const date = new Date(log.sentAt)
                        const timeAgo = formatTimeAgo(date)
                        const isSuccess = log.status === 'SENT'
                        
                        return (
                          <div
                            key={log.id}
                            className="text-xs p-2 rounded border bg-card"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isSuccess ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                  )}
                                  <span className="font-medium truncate">
                                    {log.recipient}
                                  </span>
                                </div>
                                {log.startersCount !== null && (
                                  <p className="text-muted-foreground ml-5 mt-0.5">
                                    {log.startersCount === 1 ? t('starterCount', { count: log.startersCount }) : t('starterCountPlural', { count: log.startersCount })}
                                    {log.entities.length > 0 && (
                                      <span> • {log.entities.join(', ')}</span>
                                    )}
                                  </p>
                                )}
                                {log.errorMessage && (
                                  <p className="text-red-600 dark:text-red-400 ml-5 mt-0.5">
                                    {log.errorMessage}
                                  </p>
                                )}
                              </div>
                              <span className="text-muted-foreground whitespace-nowrap text-xs">
                                {timeAgo}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {getJobEmailLogs(job.id).length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          ... en {getJobEmailLogs(job.id).length - 3} oudere verzendingen
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {result && (
                  <div
                    className={`rounded-lg border p-4 ${
                      result.success
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-2">
                        <p
                          className={`font-medium ${
                            result.success
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-red-900 dark:text-red-100'
                          }`}
                        >
                          {result.message}
                        </p>

                        {result.success && result.emailsSent !== undefined && (
                          <div className="space-y-1 text-sm">
                            <Badge
                              variant="outline"
                              className="bg-white dark:bg-gray-900"
                            >
                              {result.emailsSent} email{result.emailsSent !== 1 ? 's' : ''} verzonden
                            </Badge>

                            {result.usersNotified && result.usersNotified.length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm text-green-700 dark:text-green-300 hover:underline">
                                  Toon ontvangers ({result.usersNotified.length})
                                </summary>
                                <ul className="mt-2 space-y-1 text-xs text-green-800 dark:text-green-200 ml-4">
                                  {result.usersNotified.slice(0, 10).map((email, idx) => (
                                    <li key={idx}>• {email}</li>
                                  ))}
                                  {result.usersNotified.length > 10 && (
                                    <li className="italic">
                                      ... en {result.usersNotified.length - 10} anderen
                                    </li>
                                  )}
                                </ul>
                              </details>
                            )}
                          </div>
                        )}

                        {result.error && (
                          <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
                            <p className="font-medium">{result.error}</p>
                            {result.debugInfo && (
                              <details className="mt-2">
                                <summary className="cursor-pointer hover:underline text-xs">
                                  Toon debug info
                                </summary>
                                <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-x-auto">
                                  {result.debugInfo}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ℹ️ {t('infoTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">{t('whenEmails')}</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>{t('weeklyReminder')}:</strong> {t('whenWeekly')}</li>
              <li><strong>{t('monthlySummary')}:</strong> {t('whenMonthly')}</li>
              <li><strong>{t('quarterlySummary')}:</strong> {t('whenQuarterly')}</li>
              <li><strong>{t('yearlySummary')}:</strong> {t('whenYearly')}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">{t('whoReceives')}</h4>
            <p>{t('whoReceivesIntro')}</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>{t('whoReceives1')}</li>
              <li>{t('whoReceives2')}</li>
              <li>{t('whoReceives3')}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">{t('testingTips')}</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('testingTip1')}</li>
              <li>{t('testingTip2')}</li>
              <li>{t('testingTip3')}</li>
              <li>{t('testingTip4')}</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs">
              {t('autoScheduleDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

