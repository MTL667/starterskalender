'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck } from 'lucide-react'
import { CertificateDownload } from './CertificateDownload'

interface EntraCertificateSectionProps {
  entityId: string
  thumbprint?: string | null
  certificateExpiry?: string | null
  onGenerated: (data: { thumbprint: string; expiresAt: string }) => void
  onValidated?: (data: { status: string; licenses?: any[] }) => void
}

export function EntraCertificateSection({
  entityId,
  thumbprint,
  certificateExpiry,
  onGenerated,
  onValidated,
}: EntraCertificateSectionProps) {
  const t = useTranslations('entra')
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [validationGuidance, setValidationGuidance] = useState('')

  const hasCertificate = !!thumbprint

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch(`/api/admin/entra-connection/${entityId}/regenerate`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'CONFIGURATION_ERROR') {
          setError(t('certificate.errorMissingKey'))
        } else {
          setError(data.message || t('certificate.errorGeneric'))
        }
        return
      }

      const data = await res.json()
      setSuccess(true)
      onGenerated(data)
    } catch {
      setError(t('certificate.errorGeneric'))
    } finally {
      setGenerating(false)
    }
  }

  async function handleValidate() {
    setValidating(true)
    setValidationError('')
    setValidationGuidance('')

    try {
      const res = await fetch(`/api/admin/entra-connection/${entityId}/validate`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok && data.status === 'healthy') {
        onValidated?.(data)
      } else {
        setValidationError(data.message || t('validation.errorTransient'))
        if (data.guidance) setValidationGuidance(data.guidance)
      }
    } catch {
      setValidationError(t('validation.errorTransient'))
    } finally {
      setValidating(false)
    }
  }

  if (hasCertificate) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>{t('certificate.generated')}</span>
        </div>

        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">{t('certificate.thumbprint')}:</span>{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{thumbprint}</code>
          </div>
          {certificateExpiry && (
            <div>
              <span className="font-medium">{t('certificate.expiry')}:</span>{' '}
              {new Date(certificateExpiry).toLocaleDateString()}
            </div>
          )}
        </div>

        <CertificateDownload entityId={entityId} />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('certificate.regenerate')}
          </Button>
        </div>

        <div className="mt-3 p-3 bg-muted/50 rounded-md">
          <p className="text-sm font-medium mb-2">{t('certificate.uploadInstructions')}</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>{t('certificate.uploadStep1')}</li>
            <li>{t('certificate.uploadStep2')}</li>
            <li>{t('certificate.uploadStep3')}</li>
          </ol>
        </div>

        <Button variant="outline" size="sm" onClick={handleValidate} disabled={validating}>
          {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('certificate.uploaded')}
        </Button>

        {validationError && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-destructive">{validationError}</p>
            {validationGuidance && <p className="text-xs text-muted-foreground">{validationGuidance}</p>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('certificate.generateDescription')}</p>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{t('certificate.generated')}</p>}

      <Button onClick={handleGenerate} disabled={generating}>
        {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('certificate.generate')}
      </Button>
    </div>
  )
}
