'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface LicenseConfigPanelProps {
  jobRoleId: string
  trickleDownEnabled?: boolean
}

export function LicenseConfigPanel({ jobRoleId, trickleDownEnabled }: LicenseConfigPanelProps) {
  const t = useTranslations('entra')
  const [licenseType, setLicenseType] = useState<string>('')
  const [trickleDownOverride, setTrickleDownOverride] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [jobRoleId])

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/license-config/${jobRoleId}`)
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setLicenseType(data.requiredLicenseType || '')
          setTrickleDownOverride(data.trickleDownOverride ?? null)
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!licenseType) return
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/admin/license-config/${jobRoleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requiredLicenseType: licenseType,
          trickleDownOverride,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> {t('license.loading')}</div>
  }

  return (
    <div className="space-y-3 p-3 border rounded-md">
      <Label className="text-sm font-medium">{t('license.title')}</Label>
      <Select value={licenseType} onValueChange={setLicenseType}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('license.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BUSINESS_BASIC">{t('license.businessBasic')}</SelectItem>
          <SelectItem value="BUSINESS_STANDARD">{t('license.businessStandard')}</SelectItem>
        </SelectContent>
      </Select>

      {trickleDownEnabled !== undefined && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={trickleDownOverride === true}
            onChange={(e) => setTrickleDownOverride(e.target.checked ? true : null)}
            className="rounded"
          />
          <span>{t('license.trickleDownOverride')}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !licenseType}>
          {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {t('license.save')}
        </Button>
        {saved && <span className="text-xs text-green-600">{t('license.saved')}</span>}
      </div>
    </div>
  )
}
