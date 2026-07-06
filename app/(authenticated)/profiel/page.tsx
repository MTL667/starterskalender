'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Mail } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

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
    field: 'weeklyReminder' | 'monthlySummary' | 'quarterlySummary' | 'yearlySummary',
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
      if (!res.ok) throw new Error('Failed')
      setPreferences(prev =>
        prev.map(p =>
          p.entityId === entityId
            ? { ...p, weeklyReminder: enable, monthlySummary: enable, quarterlySummary: enable, yearlySummary: enable }
            : p
        )
      )
    } catch (error) {
      console.error('Error toggling all preferences:', error)
      alert(t('errorSavingPreference'))
    } finally {
      setUpdating(null)
    }
  }

  const countEnabled = (pref: NotificationPreference) => {
    return [pref.weeklyReminder, pref.monthlySummary, pref.quarterlySummary, pref.yearlySummary].filter(Boolean).length
  }

  const selectedPref = preferences.find(p => p.entityId === selectedEntityId)

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
            <div className="flex flex-col md:flex-row gap-6">
              {/* Entity list */}
              <div className="md:w-56 shrink-0 space-y-1" role="tablist" aria-label={t('emailNotifications')}>
                {preferences.map(pref => {
                  const enabled = countEnabled(pref)
                  const isSelected = pref.entityId === selectedEntityId
                  return (
                    <button
                      key={pref.entityId}
                      onClick={() => setSelectedEntityId(pref.entityId)}
                      aria-selected={isSelected}
                      role="tab"
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: pref.entity.colorHex }}
                        />
                        <span className="truncate font-medium" title={pref.entity.name}>{pref.entity.name}</span>
                      </div>
                      <span className={`text-xs shrink-0 ${enabled === 4 ? 'text-green-600' : enabled === 0 ? 'text-muted-foreground' : 'text-amber-600'}`}>
                        {enabled}/4
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Selected entity preferences */}
              {selectedPref && (
                <div className="flex-1 border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-5">
                    <Badge
                      style={{ backgroundColor: selectedPref.entity.colorHex, color: 'white' }}
                    >
                      {selectedPref.entity.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      disabled={updating !== null}
                      onClick={() => {
                        const allOn = countEnabled(selectedPref) === 4
                        toggleAll(selectedPref.entityId, !allOn)
                      }}
                    >
                      {countEnabled(selectedPref) === 4 ? (
                        <><BellOff className="h-3.5 w-3.5 mr-1" /> {t('allNotificationsOff')}</>
                      ) : (
                        <><Bell className="h-3.5 w-3.5 mr-1" /> {t('allNotificationsOn')}</>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${selectedPref.entityId}-weekly`}>
                          {t('weeklyReminder')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('weeklyReminderDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${selectedPref.entityId}-weekly`}
                        checked={selectedPref.weeklyReminder}
                        onCheckedChange={(value) =>
                          updatePreference(selectedPref.entityId, 'weeklyReminder', value)
                        }
                        disabled={updating !== null}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${selectedPref.entityId}-monthly`}>
                          {t('monthlySummary')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('monthlySummaryDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${selectedPref.entityId}-monthly`}
                        checked={selectedPref.monthlySummary}
                        onCheckedChange={(value) =>
                          updatePreference(selectedPref.entityId, 'monthlySummary', value)
                        }
                        disabled={updating !== null}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${selectedPref.entityId}-quarterly`}>
                          {t('quarterlySummary')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('quarterlySummaryDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${selectedPref.entityId}-quarterly`}
                        checked={selectedPref.quarterlySummary}
                        onCheckedChange={(value) =>
                          updatePreference(selectedPref.entityId, 'quarterlySummary', value)
                        }
                        disabled={updating !== null}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${selectedPref.entityId}-yearly`}>
                          {t('yearlySummary')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('yearlySummaryDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${selectedPref.entityId}-yearly`}
                        checked={selectedPref.yearlySummary}
                        onCheckedChange={(value) =>
                          updatePreference(selectedPref.entityId, 'yearlySummary', value)
                        }
                        disabled={updating !== null}
                      />
                    </div>
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

