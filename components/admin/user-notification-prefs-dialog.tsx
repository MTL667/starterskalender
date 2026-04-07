'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Loader2, Bell, BellOff, Check } from 'lucide-react'

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

type ToggleField = 'weeklyReminder' | 'monthlySummary' | 'quarterlySummary' | 'yearlySummary'

const TOGGLE_FIELDS: { key: ToggleField; icon: string }[] = [
  { key: 'weeklyReminder', icon: '🔔' },
  { key: 'monthlySummary', icon: '📊' },
  { key: 'quarterlySummary', icon: '📈' },
  { key: 'yearlySummary', icon: '🎉' },
]

interface UserNotificationPrefsDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function UserNotificationPrefsDialog({
  open,
  onClose,
  userId,
  userName,
}: UserNotificationPrefsDialogProps) {
  const t = useTranslations('adminUserNotifications')
  const tc = useTranslations('common')
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      fetchPreferences()
      setDirty(false)
      setSaved(false)
    }
  }, [open, userId])

  const fetchPreferences = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/notification-preferences`)
      if (res.ok) {
        setPreferences(await res.json())
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleField = (entityId: string, field: ToggleField, value: boolean) => {
    setPreferences(prev =>
      prev.map(p => (p.entityId === entityId ? { ...p, [field]: value } : p))
    )
    setDirty(true)
    setSaved(false)
  }

  const setAllForEntity = (entityId: string, value: boolean) => {
    setPreferences(prev =>
      prev.map(p =>
        p.entityId === entityId
          ? { ...p, weeklyReminder: value, monthlySummary: value, quarterlySummary: value, yearlySummary: value }
          : p
      )
    )
    setDirty(true)
    setSaved(false)
  }

  const setAllEntities = (value: boolean) => {
    setPreferences(prev =>
      prev.map(p => ({
        ...p,
        weeklyReminder: value,
        monthlySummary: value,
        quarterlySummary: value,
        yearlySummary: value,
      }))
    )
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/notification-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: preferences.map(p => ({
            entityId: p.entityId,
            weeklyReminder: p.weeklyReminder,
            monthlySummary: p.monthlySummary,
            quarterlySummary: p.quarterlySummary,
            yearlySummary: p.yearlySummary,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      setDirty(false)
      setSaved(true)
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      alert(t('errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  const allEnabled = (p: NotificationPreference) =>
    p.weeklyReminder && p.monthlySummary && p.quarterlySummary && p.yearlySummary

  const allDisabled = (p: NotificationPreference) =>
    !p.weeklyReminder && !p.monthlySummary && !p.quarterlySummary && !p.yearlySummary

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title', { name: userName })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : preferences.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t('noEntities')}
          </p>
        ) : (
          <>
            {/* Global controls */}
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-muted-foreground">
                {t('entityCount', { count: preferences.length })}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAllEntities(true)} className="h-7 text-xs">
                  {t('enableAll')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAllEntities(false)} className="h-7 text-xs">
                  {t('disableAll')}
                </Button>
              </div>
            </div>

            {/* Entity list */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {preferences.map(pref => (
                <div key={pref.entityId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge style={{ backgroundColor: pref.entity.colorHex, color: 'white' }}>
                        {pref.entity.name}
                      </Badge>
                      {allEnabled(pref) && (
                        <Bell className="h-3.5 w-3.5 text-green-600" />
                      )}
                      {allDisabled(pref) && (
                        <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAllForEntity(pref.entityId, true)}
                        className="h-6 text-xs px-2"
                      >
                        {tc('all')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAllForEntity(pref.entityId, false)}
                        className="h-6 text-xs px-2"
                      >
                        {tc('none')}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {TOGGLE_FIELDS.map(({ key, icon }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <Label htmlFor={`${pref.entityId}-${key}`} className="text-xs cursor-pointer">
                          {icon} {t(key)}
                        </Label>
                        <Switch
                          id={`${pref.entityId}-${key}`}
                          checked={pref[key]}
                          onCheckedChange={v => toggleField(pref.entityId, key, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Save button */}
            <div className="flex items-center justify-end gap-3 border-t pt-3">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  {t('saved')}
                </span>
              )}
              <Button onClick={handleSave} disabled={!dirty || saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tc('saving')}
                  </>
                ) : (
                  tc('save')
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
