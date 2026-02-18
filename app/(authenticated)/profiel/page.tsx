'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Mail } from 'lucide-react'
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

export default function ProfielPage() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/user/notification-preferences')
      if (res.ok) {
        const data = await res.json()
        setPreferences(data)
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
          // Behoud andere waarden
          ...(field !== 'weeklyReminder' && { weeklyReminder: pref?.weeklyReminder }),
          ...(field !== 'monthlySummary' && { monthlySummary: pref?.monthlySummary }),
          ...(field !== 'quarterlySummary' && { quarterlySummary: pref?.quarterlySummary }),
          ...(field !== 'yearlySummary' && { yearlySummary: pref?.yearlySummary }),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update preference')
      }

      // Update local state
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

  const allEnabled = (pref: NotificationPreference) => {
    return pref.weeklyReminder && pref.monthlySummary && pref.quarterlySummary && pref.yearlySummary
  }

  const allDisabled = (pref: NotificationPreference) => {
    return !pref.weeklyReminder && !pref.monthlySummary && !pref.quarterlySummary && !pref.yearlySummary
  }

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
            <div className="space-y-6">
              {preferences.map(pref => (
                <div key={pref.entityId} className="border rounded-lg p-6">
                  {/* Entity Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        style={{
                          backgroundColor: pref.entity.colorHex,
                          color: 'white',
                        }}
                      >
                        {pref.entity.name}
                      </Badge>
                      {allEnabled(pref) ? (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <Bell className="h-4 w-4" />
                          <span>{t('allNotificationsOn')}</span>
                        </div>
                      ) : allDisabled(pref) ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <BellOff className="h-4 w-4" />
                          <span>{t('allNotificationsOff')}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Notification Toggles */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${pref.entityId}-weekly`}>
                          {'🔔 ' + t('weeklyReminder')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('weeklyReminderDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${pref.entityId}-weekly`}
                        checked={pref.weeklyReminder}
                        onCheckedChange={(value) =>
                          updatePreference(pref.entityId, 'weeklyReminder', value)
                        }
                        disabled={updating === `${pref.entityId}-weeklyReminder`}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${pref.entityId}-monthly`}>
                          {'📊 ' + t('monthlySummary')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('monthlySummaryDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${pref.entityId}-monthly`}
                        checked={pref.monthlySummary}
                        onCheckedChange={(value) =>
                          updatePreference(pref.entityId, 'monthlySummary', value)
                        }
                        disabled={updating === `${pref.entityId}-monthlySummary`}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${pref.entityId}-quarterly`}>
                          {'📈 ' + t('quarterlySummary')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('quarterlySummaryDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${pref.entityId}-quarterly`}
                        checked={pref.quarterlySummary}
                        onCheckedChange={(value) =>
                          updatePreference(pref.entityId, 'quarterlySummary', value)
                        }
                        disabled={updating === `${pref.entityId}-quarterlySummary`}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`${pref.entityId}-yearly`}>
                          {'🎉 ' + t('yearlySummary')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('yearlySummaryDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${pref.entityId}-yearly`}
                        checked={pref.yearlySummary}
                        onCheckedChange={(value) =>
                          updatePreference(pref.entityId, 'yearlySummary', value)
                        }
                        disabled={updating === `${pref.entityId}-yearlySummary`}
                      />
                    </div>
                  </div>
                </div>
              ))}
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

