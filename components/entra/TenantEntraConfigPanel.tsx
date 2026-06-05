'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface TenantEntraConfigPanelProps {
  entityId: string
}

interface TenantConfig {
  trickleDownEnabled: boolean
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSpecialChars: boolean
}

export function TenantEntraConfigPanel({ entityId }: TenantEntraConfigPanelProps) {
  const t = useTranslations('entra')
  const [config, setConfig] = useState<TenantConfig>({
    trickleDownEnabled: false,
    passwordMinLength: 16,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [entityId])

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tenant-entra-config/${entityId}`)
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/admin/tenant-entra-config/${entityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 border rounded-md">
        <Label className="text-sm font-medium">{t('trickleDown.title')}</Label>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('trickleDown.description')}</span>
          <Switch
            checked={config.trickleDownEnabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, trickleDownEnabled: checked }))}
          />
        </div>
      </div>

      <div className="space-y-3 p-3 border rounded-md">
        <Label className="text-sm font-medium">{t('password.title')}</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="pwd-min" className="text-xs w-32">{t('password.minLength')}</Label>
            <Input
              id="pwd-min"
              type="number"
              min={8}
              max={64}
              value={config.passwordMinLength}
              onChange={(e) => setConfig(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 16 }))}
              className="w-20"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{t('password.requireUppercase')}</span>
            <Switch
              checked={config.passwordRequireUppercase}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, passwordRequireUppercase: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{t('password.requireNumbers')}</span>
            <Switch
              checked={config.passwordRequireNumbers}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, passwordRequireNumbers: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{t('password.requireSpecialChars')}</span>
            <Switch
              checked={config.passwordRequireSpecialChars}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, passwordRequireSpecialChars: checked }))}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {t('tenantConfig.save')}
        </Button>
        {saved && <span className="text-xs text-green-600">{t('tenantConfig.saved')}</span>}
      </div>
    </div>
  )
}
