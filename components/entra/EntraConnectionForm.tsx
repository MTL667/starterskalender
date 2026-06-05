'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface EntraConnectionFormProps {
  entityId: string
  onSuccess: (connection: any) => void
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function EntraConnectionForm({ entityId, onSuccess }: EntraConnectionFormProps) {
  const t = useTranslations('entra')
  const tc = useTranslations('common')
  const [clientId, setClientId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ clientId?: string; tenantId?: string }>({})

  const validate = (): boolean => {
    const errors: { clientId?: string; tenantId?: string } = {}
    if (!clientId.trim()) {
      errors.clientId = t('connection.clientIdRequired')
    } else if (!UUID_REGEX.test(clientId.trim())) {
      errors.clientId = t('connection.clientIdInvalid')
    }
    if (!tenantId.trim()) {
      errors.tenantId = t('connection.tenantIdRequired')
    } else if (!UUID_REGEX.test(tenantId.trim())) {
      errors.tenantId = t('connection.tenantIdInvalid')
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setError('')

    if (!validate()) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/entra-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          clientId: clientId.trim(),
          tenantId: tenantId.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || tc('error'))
        return
      }

      const connection = await res.json()
      onSuccess(connection)
    } catch {
      setError(tc('error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('connection.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entra-client-id">{t('connection.clientId')}</Label>
            <Input
              id="entra-client-id"
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setFieldErrors(prev => ({ ...prev, clientId: undefined })) }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={saving}
            />
            {fieldErrors.clientId && (
              <p className="text-xs text-destructive">{fieldErrors.clientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entra-tenant-id">{t('connection.tenantId')}</Label>
            <Input
              id="entra-tenant-id"
              value={tenantId}
              onChange={(e) => { setTenantId(e.target.value); setFieldErrors(prev => ({ ...prev, tenantId: undefined })) }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={saving}
            />
            {fieldErrors.tenantId && (
              <p className="text-xs text-destructive">{fieldErrors.tenantId}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('connection.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
