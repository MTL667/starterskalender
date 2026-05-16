'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle } from 'lucide-react'

interface SlaConfig {
  id: string
  name: string
  slaWarningDays: number
  slaExceededDays: number
}

export function SlaSection() {
  const t = useTranslations('recruitment.sla')
  const [configs, setConfigs] = useState<SlaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/recruitment/admin/sla')
      .then(r => r.json())
      .then(({ data }) => setConfigs(data ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(entityId: string) {
    const config = configs.find(c => c.id === entityId)
    if (!config) return
    setSaving(entityId)
    try {
      const res = await fetch('/api/recruitment/admin/sla', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          slaWarningDays: config.slaWarningDays,
          slaExceededDays: config.slaExceededDays,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setConfigs(prev => prev.map(c => c.id === entityId ? data : c))
      }
    } finally { setSaving(null) }
  }

  function updateConfig(entityId: string, field: keyof SlaConfig, value: number) {
    setConfigs(prev => prev.map(c => c.id === entityId ? { ...c, [field]: value } : c))
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('loading')}</p>

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t('title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t('description')}</p>

      {configs.map(config => (
        <div key={config.id} className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium">{config.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">{t('warningDays')}</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={config.slaWarningDays}
                onChange={e => updateConfig(config.id, 'slaWarningDays', parseInt(e.target.value) || 7)}
              />
            </div>
            <div>
              <Label className="text-xs">{t('exceededDays')}</Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={config.slaExceededDays}
                onChange={e => updateConfig(config.id, 'slaExceededDays', parseInt(e.target.value) || 14)}
              />
            </div>
          </div>
          <Button size="sm" onClick={() => handleSave(config.id)} disabled={saving === config.id}>
            {saving === config.id ? t('saving') : t('save')}
          </Button>
        </div>
      ))}
    </section>
  )
}
