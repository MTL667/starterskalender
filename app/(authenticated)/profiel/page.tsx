'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, BellOff, Mail, Check } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface NotificationPreference {
  id: string
  entityId: string
  weeklyReminder: boolean
  monthlySummary: boolean
  quarterlySummary: boolean
  yearlySummary: boolean
  entity: {
    id: string
    name: string
    colorHex: string
  }
}

type NotifField = 'weeklyReminder' | 'monthlySummary' | 'quarterlySummary' | 'yearlySummary'

export default function ProfielPage() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
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
        setPreferences(data)
        if (data.length > 0 && !selectedEntityId) {
          setSelectedEntityId(data[0].entityId)
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (
    entityId: string,
    field: NotifField,
    value: boolean
  ) => {
    setUpdating(`${entityId}-${field}`)

    try {
      const pref = preferences.find(p => p.entityId === entityId)
      
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          [field]: value,
          ...(field !== 'weeklyReminder' && { weeklyReminder: pref?.weeklyReminder }),
          ...(field !== 'monthlySummary' && { monthlySummary: pref?.monthlySummary }),
          ...(field !== 'quarterlySummary' && { quarterlySummary: pref?.quarterlySummary }),
          ...(field !== 'yearlySummary' && { yearlySummary: pref?.yearlySummary }),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update preference')
      }

      setPreferences(prev =>
        prev.map(p =>
          p.entityId === entityId ? { ...p, [field]: value } : p
        )
      )
    } catch (error) {
      console.error('Error updating preference:', error)
      alert(t('errorSavingPreference'))
    } finally {
      setUpdating(null)
    }
  }

  const toggleAll = async (entityId: string, enable: boolean) => {
    const fields: NotifField[] = ['weeklyReminder', 'monthlySummary', 'quarterlySummary', 'yearlySummary']
    setUpdating(`${entityId}-all`)

    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          weeklyReminder: enable,
          monthlySummary: enable,
          quarterlySummary: enable,
          yearlySummary: enable,
        }),
      })

      if (!res.ok) throw new Error('Failed to update')

      setPreferences(prev =>
        prev.map(p =>
          p.entityId === entityId
            ? { ...p, weeklyReminder: enable, monthlySummary: enable, quarterlySummary: enable, yearlySummary: enable }
            : p
        )
      )
    } catch (error) {
      console.error('Error updating preferences:', error)
    } finally {
      setUpdating(null)
    }
  }

  const enabledCount = (pref: NotificationPreference) => {
    return [pref.weeklyReminder, pref.monthlySummary, pref.quarterlySummary, pref.yearlySummary].filter(Boolean).length
  }

  const selectedPref = preferences.find(p => p.entityId === selectedEntityId)

  const NOTIF_OPTIONS: { field: NotifField; labelKey: string; descKey: string }[] = [
    { field: 'weeklyReminder', labelKey: 'weeklyReminder', descKey: 'weeklyReminderDescription' },
    { field: 'monthlySummary', labelKey: 'monthlySummary', descKey: 'monthlySummaryDescription' },
    { field: 'quarterlySummary', labelKey: 'quarterlySummary', descKey: 'quarterlySummaryDescription' },
    { field: 'yearlySummary', labelKey: 'yearlySummary', descKey: 'yearlySummaryDescription' },
  ]

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
                  const count = enabledCount(pref)
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
                      <span className={`text-xs tabular-nums ${count === 4 ? 'text-green-600' : count === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {count}/4
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
                      {enabledCount(selectedPref) === 4 && (
                        <span className="flex items-center gap-1.5 text-xs text-green-600">
                          <Check className="h-3 w-3" /> Alles aan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAll(selectedPref.entityId, true)}
                        disabled={updating === `${selectedPref.entityId}-all` || enabledCount(selectedPref) === 4}
                        className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        Alles aan
                      </button>
                      <span className="text-muted-foreground text-xs">|</span>
                      <button
                        onClick={() => toggleAll(selectedPref.entityId, false)}
                        disabled={updating === `${selectedPref.entityId}-all` || enabledCount(selectedPref) === 0}
                        className="text-xs text-muted-foreground hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        Alles uit
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {NOTIF_OPTIONS.map(({ field, labelKey, descKey }) => (
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
                          checked={selectedPref[field]}
                          onCheckedChange={(value) =>
                            updatePreference(selectedPref.entityId, field, value)
                          }
                          disabled={updating === `${selectedPref.entityId}-${field}` || updating === `${selectedPref.entityId}-all`}
                        />
                      </div>
                    ))}
                  </div>
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
        </ul>
      </div>
    </div>
  )
}

