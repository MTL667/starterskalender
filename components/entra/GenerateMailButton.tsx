'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, CheckCircle2, Copy, RotateCcw, Trash2, KeyRound } from 'lucide-react'
import { ProvisioningStatus } from './ProvisioningStatus'
import { useProvisioningStatus } from '@/lib/hooks/use-provisioning-status'

interface GenerateMailButtonProps {
  starterId: string
  entityId: string
  hasHealthyConnection: boolean
  hasLicenseConfig: boolean
  canEdit: boolean
}

export function GenerateMailButton({
  starterId,
  entityId,
  hasHealthyConnection,
  hasLicenseConfig,
  canEdit,
}: GenerateMailButtonProps) {
  const t = useTranslations('entra.provisioning')
  const [triggering, setTriggering] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [alreadyProvisioned, setAlreadyProvisioned] = useState(false)
  const [generatingTap, setGeneratingTap] = useState(false)

  const { status, isActive, isFailed, isSuccess, startedAt, reconnect } = useProvisioningStatus(starterId)

  useEffect(() => {
    if (!starterId) return
    fetch(`/api/provisioning/${starterId}`)
      .then(res => res.json())
      .then(data => {
        if (data.jobs?.some((j: any) => j.state === 'SUCCESS')) {
          setAlreadyProvisioned(true)
        }
      })
      .catch(() => {})
  }, [starterId])

  useEffect(() => {
    if (isActive || isFailed || isSuccess) {
      setTriggering(false)
    }
    if (isSuccess && status.temporaryPassword) {
      setTempPassword(status.temporaryPassword)
      setAlreadyProvisioned(true)
    }
  }, [isActive, isFailed, isSuccess, status.temporaryPassword])

  const handleGenerate = useCallback(async () => {
    setTriggering(true)
    try {
      const res = await fetch(`/api/provisioning/${starterId}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start provisioning')
      }
      reconnect()
    } catch (err: any) {
      console.error('Provisioning error:', err)
      setTriggering(false)
    }
  }, [starterId, reconnect])

  const handleNewTap = useCallback(async () => {
    setGeneratingTap(true)
    setTempPassword(null)
    setCopied(false)
    try {
      const res = await fetch(`/api/provisioning/${starterId}/new-tap`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create TAP')
      }
      const data = await res.json()
      setTempPassword(data.temporaryAccessPass)
    } catch (err: any) {
      console.error('New TAP error:', err)
    } finally {
      setGeneratingTap(false)
    }
  }, [starterId])

  const handleRetry = useCallback(async () => {
    if (!status.id) return
    setTriggering(true)
    try {
      await fetch(`/api/provisioning/${starterId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: status.id }),
      })
      reconnect()
    } finally {
      setTriggering(false)
    }
  }, [starterId, status.id, reconnect])

  const handleRemoveUser = useCallback(async () => {
    if (!status.id) return
    setTriggering(true)
    try {
      await fetch(`/api/provisioning/${starterId}/remove-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: status.id }),
      })
      reconnect()
    } finally {
      setTriggering(false)
    }
  }, [starterId, status.id, reconnect])

  const handleCopy = useCallback(async () => {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }, [tempPassword])

  if (!canEdit || !hasHealthyConnection || !hasLicenseConfig) {
    return null
  }

  // Already provisioned: show "New TAP" UI
  if (alreadyProvisioned && !isActive && !isFailed) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">{t('alreadyProvisioned')}</span>
        </div>
        {tempPassword && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-800">{t('credentialCard.title')}</p>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded text-sm font-mono">{tempPassword}</code>
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-amber-600">{t('credentialCard.warning')}</p>
            <p className="text-xs text-blue-600">{t('credentialCard.mailboxInfo')}</p>
          </div>
        )}
        <Button onClick={handleNewTap} disabled={generatingTap} variant="outline">
          {generatingTap ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <KeyRound className="h-4 w-4 mr-2" />
          )}
          {t('newTap')}
        </Button>
      </div>
    )
  }

  if (isActive || triggering) {
    return (
      <div className="space-y-3">
        <Button disabled>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {t('inProgress')}
        </Button>
        <ProvisioningStatus
          state={status.state}
          startedAt={startedAt}
          assignedLicenseType={status.assignedLicenseType}
        />
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="space-y-3">
        <ProvisioningStatus
          state={status.state}
          error={status.error}
          assignedLicenseType={status.assignedLicenseType}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRetry} disabled={triggering}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
          {status.state !== 'FAILED_AT_LICENSE_CHECK' && (
            <Button variant="destructive" size="sm" onClick={handleRemoveUser} disabled={triggering}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('removeUser')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Button onClick={handleGenerate} disabled={triggering}>
      <Mail className="h-4 w-4 mr-2" />
      {t('generateMail')}
    </Button>
  )
}
