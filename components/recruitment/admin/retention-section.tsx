'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield } from 'lucide-react'

interface RetentionConfig {
  id: string
  name: string
  retentionDays: number
  retentionGraceDays: number
  retentionNotifyDays: number
}

export function RetentionSection() {
  const t = useTranslations('recruitment.retention')
  const [configs, setConfigs] = useState<RetentionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/recruitment/admin/retention')
      .then(r => r.json())
      .then(({ data }) => setConfigs(data ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(entityId: string) {
    const config = configs.find(c => c.id === entityId)
    if (!config) return
    setSaving(entityId)
    try {
      const res = await fetch('/api/recruitment/admin/retention', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          retentionDays: config.retentionDays,
          retentionGraceDays: config.retentionGraceDays,
          retentionNotifyDays: config.retentionNotifyDays,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setConfigs(prev => prev.map(c => c.id === entityId ? data : c))
      }
    } finally { setSaving(null) }
  }

  function updateConfig(entityId: string, field: keyof RetentionConfig, value: number) {
    setConfigs(prev => prev.map(c => c.id === entityId ? { ...c, [field]: value } : c))
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('loading')}</p>

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t('title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      {configs.map(config => (
        <div key={config.id} className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium">{config.name}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">{t('retentionDays')}</Label>
              <Input
                type="number"
                min={30}
                max={3650}
                value={config.retentionDays}
                onChange={e => updateConfig(config.id, 'retentionDays', parseInt(e.target.value) || 365)}
              />
            </div>
            <div>
              <Label className="text-xs">{t('graceDays')}</Label>
              <Input
                type="number"
                min={7}
                max={90}
                value={config.retentionGraceDays}
                onChange={e => updateConfig(config.id, 'retentionGraceDays', parseInt(e.target.value) || 30)}
              />
            </div>
            <div>
              <Label className="text-xs">{t('notifyDays')}</Label>
              <Input
                type="number"
                min={7}
                max={90}
                value={config.retentionNotifyDays}
                onChange={e => updateConfig(config.id, 'retentionNotifyDays', parseInt(e.target.value) || 30)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('summary', { retention: config.retentionDays, notify: config.retentionNotifyDays, grace: config.retentionGraceDays })}
          </p>
          <Button size="sm" onClick={() => handleSave(config.id)} disabled={saving === config.id}>
            {saving === config.id ? t('saving') : t('save')}
          </Button>
        </div>
      ))}
    </section>
  )
}
