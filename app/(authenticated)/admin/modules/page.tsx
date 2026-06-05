'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface ModuleFlag {
  key: string
  label: string
  description: string
  enabled: boolean
}

export default function ModulesPage() {
  const t = useTranslations('adminModules')
  const [modules, setModules] = useState<ModuleFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadModules()
  }, [])

  async function loadModules() {
    try {
      const res = await fetch('/api/admin/modules')
      if (res.ok) {
        const data = await res.json()
        setModules(data.modules)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(key: string, enabled: boolean) {
    setSaving(key)
    try {
      await fetch('/api/admin/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      })
      setModules(prev =>
        prev.map(m => (m.key === key ? { ...m, enabled } : m))
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" />
        {t('backToAdmin')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((mod) => (
                <div key={mod.key} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">{mod.label}</Label>
                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saving === mod.key && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Switch
                      checked={mod.enabled}
                      onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                      disabled={saving !== null}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
