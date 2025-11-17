'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, Send, Loader2, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface CronJob {
  id: string
  name: string
  description: string
  schedule: string
  endpoint: string
  icon: string
}

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
}

// Helper functie voor "time ago" formatting
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'nu'
  if (diffMins < 60) return `${diffMins}m geleden`
  if (diffHours < 24) return `${diffHours}u geleden`
  if (diffDays < 7) return `${diffDays}d geleden`
  
  return date.toLocaleDateString('nl-BE', { 
    day: 'numeric', 
    month: 'short',
    year: diffDays > 365 ? 'numeric' : undefined
  })
}

const cronJobs: CronJob[] = [
  {
    id: 'weekly',
    name: 'Wekelijkse Reminder',
    description: 'Verstuurt reminders voor starters die over 7 dagen beginnen',
    schedule: 'Dagelijks om 08:00',
    endpoint: '/api/cron/send-weekly-reminders',
    icon: '📅',
  },
  {
    id: 'monthly',
    name: 'Maandoverzicht',
    description: 'Overzicht van alle starters van afgelopen maand',
    schedule: '1e van elke maand om 09:00',
    endpoint: '/api/cron/send-monthly-summary',
    icon: '📊',
  },
  {
    id: 'quarterly',
    name: 'Kwartaaloverzicht',
    description: 'Overzicht van vorig kwartaal (jan/apr/jul/okt)',
    schedule: '1e van kwartaal om 10:00',
    endpoint: '/api/cron/send-quarterly-summary',
    icon: '📈',
  },
  {
    id: 'yearly',
    name: 'Jaaroverzicht',
    description: 'Volledig overzicht van vorig jaar',
    schedule: '1 januari om 11:00',
    endpoint: '/api/cron/send-yearly-summary',
    icon: '🎉',
  },
]

export default function CronJobsPage() {
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

  const previewRecipients = async (job: CronJob) => {
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
        
        // Standaard alle recipients selecteren
        const allEmails = new Set<string>(data.recipients.map((r: RecipientPreview) => r.email))
        setSelectedRecipients(prev => ({ ...prev, [job.id]: allEmails }))
        
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

  const triggerJob = async (job: CronJob) => {
    setLoading(job.id)
    setResults(prev => ({ ...prev, [job.id]: { success: false, message: 'Bezig met verzenden...' } }))

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
            message: data.message || 'Emails succesvol verstuurd!',
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
        const errorMessage = data.error || 'Onbekende fout'
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
          message: 'Fout bij verzenden',
          error: error instanceof Error ? error.message : 'Onbekende fout',
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cron Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Handmatig email notificaties versturen of testen
        </p>
      </div>

      {/* Diagnostics Alert */}
      {!diagnosticsLoading && diagnostics && diagnostics.recommendations && (
        <Alert variant={diagnostics.recommendations[0].startsWith('✅') ? 'default' : 'destructive'}>
          <Info className="h-4 w-4" />
          <AlertTitle>Configuratie Status</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {diagnostics.recommendations.map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
            {!diagnostics.environment.cronSecret.configured && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-1">Hoe te fixen:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Generate CRON_SECRET: <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</code></li>
                  <li>Voeg toe aan Easypanel environment variables</li>
                  <li>Rebuild de app</li>
                </ol>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Let op</AlertTitle>
        <AlertDescription>
          Deze functie stuurt <strong>echte emails</strong> naar gebruikers met actieve notificatie voorkeuren.
          Gebruik dit alleen voor testing of wanneer je bewust emails wilt versturen buiten de normale schedule.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {cronJobs.map(job => {
          const result = results[job.id]
          const isLoading = loading === job.id

          return (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <span>{job.icon}</span>
                      {job.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {job.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{job.schedule}</span>
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
                      Ontvangers ophalen...
                    </>
                  ) : (
                    <>
                      👥 Toon Ontvangers
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
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        Selecteer Ontvangers ({selectedRecipients[job.id]?.size || 0} geselecteerd)
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => selectAllRecipients(job.id, true)}
                          className="h-7 text-xs"
                        >
                          Alles
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => selectAllRecipients(job.id, false)}
                          className="h-7 text-xs"
                        >
                          Geen
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {recipientPreviews[job.id].map((recipient) => {
                        const isSelected = selectedRecipients[job.id]?.has(recipient.email) || false
                        
                        return (
                          <label
                            key={recipient.email}
                            className="flex items-start gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRecipient(job.id, recipient.email)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {recipient.name || recipient.email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {recipient.email !== recipient.name && (
                                  <span className="block truncate">{recipient.email}</span>
                                )}
                                {recipient.startersCount} starter{recipient.startersCount !== 1 ? 's' : ''}
                                {recipient.entities.length > 0 && (
                                  <span> • {recipient.entities.join(', ')}</span>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
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
                      Bezig met verzenden...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {showRecipients[job.id] && (selectedRecipients[job.id]?.size || 0) > 0
                        ? `Verzenden naar ${selectedRecipients[job.id]?.size} ontvanger${(selectedRecipients[job.id]?.size || 0) !== 1 ? 's' : ''}`
                        : 'Nu Verzenden'}
                    </>
                  )}
                </Button>

                {/* Email Logs - Laatste verzendingen */}
                {!logsLoading && getJobEmailLogs(job.id).length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                      📧 Laatste Verzendingen
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
                                    {log.startersCount} starter{log.startersCount !== 1 ? 's' : ''}
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
          <CardTitle>ℹ️ Informatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Wanneer worden emails verstuurd?</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Wekelijkse Reminder:</strong> Alleen voor starters die <strong>exact 7 dagen</strong> in de toekomst beginnen</li>
              <li><strong>Maandoverzicht:</strong> Alle starters van de <strong>afgelopen maand</strong></li>
              <li><strong>Kwartaaloverzicht:</strong> Alle starters van het <strong>vorige kwartaal</strong></li>
              <li><strong>Jaaroverzicht:</strong> Alle starters van het <strong>vorige jaar</strong></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Wie ontvangt de emails?</h4>
            <p>
              Alleen gebruikers die:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Notificatie voorkeuren hebben ingeschakeld voor deze frequentie</li>
              <li>Toegang hebben tot minimaal één entiteit met relevante starters</li>
              <li>Een geverifieerd email adres hebben</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Testing Tips</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Test eerst met je eigen account (zorg dat je notificaties aan hebt staan)</li>
              <li>Check de audit log na verzending voor details</li>
              <li>Wekelijkse reminder werkt alleen als er starters zijn over exact 7 dagen</li>
              <li>Voor testing: voeg een starter toe met startdatum = vandaag + 7 dagen</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs">
              <strong>Automatische Schedule:</strong> Deze jobs draaien automatisch op de ingestelde tijden.
              Dit paneel is bedoeld voor handmatige triggers en testing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

