'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Mail, Check, ClipboardList, Package, UserX, UserPlus, Shield } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface NotificationPreference {
  id: string
  entityId: string
  weeklyReminder: boolean
  monthlySummary: boolean
  quarterlySummary: boolean
  yearlySummary: boolean
  taskEmails: boolean
  materialAlerts: boolean
  starterCancellation: boolean
  starterCreated: boolean
  entraAlerts: boolean
  entity: {
    id: string
    name: string
    colorHex: string
  }
}

interface EntityCapabilities {
  tasks: boolean
  materials: boolean
  cancellation: boolean
  starterCreated: boolean
  entra: boolean
}

type NotifField = keyof Omit<NotificationPreference, 'id' | 'entityId' | 'entity'>

interface NotifOption {
  field: NotifField
  labelKey: string
  descKey: string
  capability?: keyof EntityCapabilities
}

const DIGEST_OPTIONS: NotifOption[] = [
  { field: 'weeklyReminder', labelKey: 'weeklyReminder', descKey: 'weeklyReminderDescription' },
  { field: 'monthlySummary', labelKey: 'monthlySummary', descKey: 'monthlySummaryDescription' },
  { field: 'quarterlySummary', labelKey: 'quarterlySummary', descKey: 'quarterlySummaryDescription' },
  { field: 'yearlySummary', labelKey: 'yearlySummary', descKey: 'yearlySummaryDescription' },
]

const OPERATIONAL_OPTIONS: NotifOption[] = [
  { field: 'taskEmails', labelKey: 'taskEmails', descKey: 'taskEmailsDescription', capability: 'tasks' },
  { field: 'materialAlerts', labelKey: 'materialAlerts', descKey: 'materialAlertsDescription', capability: 'materials' },
  { field: 'starterCancellation', labelKey: 'starterCancellation', descKey: 'starterCancellationDescription', capability: 'cancellation' },
  { field: 'starterCreated', labelKey: 'starterCreated', descKey: 'starterCreatedDescription', capability: 'starterCreated' },
  { field: 'entraAlerts', labelKey: 'entraAlerts', descKey: 'entraAlertsDescription', capability: 'entra' },
]

export default function ProfielPage() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [capabilities, setCapabilities] = useState<Record<string, EntityCapabilities>>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/user/notification-preferences')
      if (res.ok) {
        const data = await res.json()
        const prefs = data.preferences || data
        const caps = data.capabilities || {}
        setPreferences(prefs)
        setCapabilities(caps)
        if (prefs.length > 0 && !selectedEntityId) {
          setSelectedEntityId(prefs[0].entityId)
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (entityId: string, field: NotifField, value: boolean) => {
    setUpdating(`${entityId}-${field}`)

    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, [field]: value }),
      })

      if (!res.ok) throw new Error('Failed to update preference')

      setPreferences(prev =>
        prev.map(p => p.entityId === entityId ? { ...p, [field]: value } : p)
      )
    } catch (error) {
      console.error('Error updating preference:', error)
      alert(t('errorSavingPreference'))
    } finally {
      setUpdating(null)
    }
  }

  const toggleAll = async (entityId: string, enable: boolean) => {
    setUpdating(`${entityId}-all`)

    const payload: Record<string, boolean | string> = {
      entityId,
      weeklyReminder: enable,
      monthlySummary: enable,
      quarterlySummary: enable,
      yearlySummary: enable,
      taskEmails: enable,
      materialAlerts: enable,
      starterCancellation: enable,
      starterCreated: enable,
      entraAlerts: enable,
    }

    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to update')

      setPreferences(prev =>
        prev.map(p => {
          if (p.entityId !== entityId) return p
          return {
            ...p,
            weeklyReminder: enable,
            monthlySummary: enable,
            quarterlySummary: enable,
            yearlySummary: enable,
            taskEmails: enable,
            materialAlerts: enable,
            starterCancellation: enable,
            starterCreated: enable,
            entraAlerts: enable,
          }
        })
      )
    } catch (error) {
      console.error('Error updating preferences:', error)
    } finally {
      setUpdating(null)
    }
  }

  const enabledCount = (pref: NotificationPreference) => {
    const entityCaps = capabilities[pref.entityId]
    let total = 4
    let enabled = [pref.weeklyReminder, pref.monthlySummary, pref.quarterlySummary, pref.yearlySummary].filter(Boolean).length

    if (entityCaps?.tasks) { total++; if (pref.taskEmails) enabled++ }
    if (entityCaps?.materials) { total++; if (pref.materialAlerts) enabled++ }
    if (entityCaps?.cancellation) { total++; if (pref.starterCancellation) enabled++ }
    if (entityCaps?.starterCreated) { total++; if (pref.starterCreated) enabled++ }
    if (entityCaps?.entra) { total++; if (pref.entraAlerts) enabled++ }

    return { enabled, total }
  }

  const selectedPref = preferences.find(p => p.entityId === selectedEntityId)
  const entityCaps = selectedEntityId ? capabilities[selectedEntityId] : undefined
  const visibleOperational = OPERATIONAL_OPTIONS.filter(opt => !opt.capability || entityCaps?.[opt.capability])

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {session?.user?.name || session?.user?.email}
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{t('emailNotifications')}</CardTitle>
              <CardDescription>
                {t('emailNotificationsDescription')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {tc('loading')}
            </div>
          ) : preferences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noEntityAccess')}
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Entity list (sidebar) */}
              <div className="w-56 shrink-0 space-y-1">
                {preferences.map(pref => {
                  const { enabled, total } = enabledCount(pref)
                  const isSelected = pref.entityId === selectedEntityId
                  return (
                    <button
                      key={pref.entityId}
                      onClick={() => setSelectedEntityId(pref.entityId)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: pref.entity.colorHex }}
                      />
                      <span className="truncate font-medium flex-1">{pref.entity.name}</span>
                      <span className={`text-xs tabular-nums ${enabled === total ? 'text-green-600' : enabled === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {enabled}/{total}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Notification toggles for selected entity */}
              {selectedPref && (
                <div className="flex-1 border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Badge
                        style={{ backgroundColor: selectedPref.entity.colorHex, color: 'white' }}
                      >
                        {selectedPref.entity.name}
                      </Badge>
                      {(() => {
                        const { enabled, total } = enabledCount(selectedPref)
                        return enabled === total ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-600">
                            <Check className="h-3 w-3" /> Alles aan
                          </span>
                        ) : null
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const { enabled, total } = enabledCount(selectedPref)
                        return (
                          <>
                            <button
                              onClick={() => toggleAll(selectedPref.entityId, true)}
                              disabled={updating === `${selectedPref.entityId}-all` || enabled === total}
                              className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              {t('allNotificationsOn')}
                            </button>
                            <span className="text-muted-foreground text-xs">|</span>
                            <button
                              onClick={() => toggleAll(selectedPref.entityId, false)}
                              disabled={updating === `${selectedPref.entityId}-all` || enabled === 0}
                              className="text-xs text-muted-foreground hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              {t('allNotificationsOff')}
                            </button>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Digest section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      {t('categoryDigests')}
                    </h4>
                    <div className="space-y-4">
                      {DIGEST_OPTIONS.map(({ field, labelKey, descKey }) => (
                        <div key={field} className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor={`${selectedPref.entityId}-${field}`}>
                              {t(labelKey)}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {t(descKey)}
                            </p>
                          </div>
                          <Switch
                            id={`${selectedPref.entityId}-${field}`}
                            checked={selectedPref[field] as boolean}
                            onCheckedChange={(value) => updatePreference(selectedPref.entityId, field, value)}
                            disabled={updating === `${selectedPref.entityId}-${field}` || updating === `${selectedPref.entityId}-all`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational section */}
                  {visibleOperational.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        {getOperationalIcon(visibleOperational)}
                        {t('categoryOperational')}
                      </h4>
                      <div className="space-y-4">
                        {visibleOperational.map(({ field, labelKey, descKey }) => (
                          <div key={field} className="flex items-center justify-between">
                            <div className="space-y-0.5 flex items-center gap-2">
                              <div>
                                <Label htmlFor={`${selectedPref.entityId}-${field}`}>
                                  {t(labelKey)}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {t(descKey)}
                                </p>
                              </div>
                            </div>
                            <Switch
                              id={`${selectedPref.entityId}-${field}`}
                              checked={selectedPref[field] as boolean}
                              onCheckedChange={(value) => updatePreference(selectedPref.entityId, field, value)}
                              disabled={updating === `${selectedPref.entityId}-${field}` || updating === `${selectedPref.entityId}-all`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
        <p className="font-medium mb-2">{'ℹ️ ' + t('aboutNotifications')}</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>{t('notificationsInfo1')}</li>
          <li>{t('notificationsInfo2')}</li>
          <li>{t('notificationsInfo3')}</li>
          <li>{t('notificationsInfo4')}</li>
        </ul>
      </div>
    </div>
  )
}

function getOperationalIcon(options: NotifOption[]) {
  if (options.length === 0) return null
  const first = options[0].field
  switch (first) {
    case 'taskEmails': return <ClipboardList className="h-3.5 w-3.5" />
    case 'materialAlerts': return <Package className="h-3.5 w-3.5" />
    case 'starterCancellation': return <UserX className="h-3.5 w-3.5" />
    case 'starterCreated': return <UserPlus className="h-3.5 w-3.5" />
    case 'entraAlerts': return <Shield className="h-3.5 w-3.5" />
    default: return <Shield className="h-3.5 w-3.5" />
  }
}
