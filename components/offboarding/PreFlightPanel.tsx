'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { OooTemplateDialog } from './OooTemplateDialog'

interface PreFlightResult {
  litigationHold: boolean
  mailboxSizeMb: number
  teamsOwnerships: { groupId: string; groupName: string }[]
  graphApiHealthy: boolean
  graphApiError?: string
  oooTemplateConfigured?: boolean
  checkedAt: string
  allClear: boolean
}

interface PreFlightPanelProps {
  starterId: string
  entityId?: string
  jobRoleId?: string
  jobRoleTitle?: string
  hasPermission?: boolean
  onResult: (result: PreFlightResult) => void
}

export function PreFlightPanel({ starterId, entityId, jobRoleId, jobRoleTitle, hasPermission, onResult }: PreFlightPanelProps) {
  const [result, setResult] = useState<PreFlightResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [oooDialogOpen, setOooDialogOpen] = useState(false)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const t = useTranslations('offboarding')

  const fetchPreflight = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/offboarding/${starterId}/preflight`)
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        onResultRef.current(data)
      }
    } finally {
      setLoading(false)
    }
  }, [starterId])

  useEffect(() => {
    fetchPreflight()
  }, [fetchPreflight])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('checkingReadiness')}
      </div>
    )
  }

  if (!result) return null

  const showOooWarning = result.oooTemplateConfigured === false

  if (result.allClear && !showOooWarning) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        {t('readyForOffboarding')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {!result.graphApiHealthy && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {t('graphApiUnavailable')}{result.graphApiError ? `: ${result.graphApiError}` : ''}
          </AlertDescription>
        </Alert>
      )}

      {result.litigationHold && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{t('litigationHoldDetected')}</AlertDescription>
        </Alert>
      )}

      {result.mailboxSizeMb >= 50000 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('mailboxTooLarge', { sizeMb: Math.round(result.mailboxSizeMb) })}
          </AlertDescription>
        </Alert>
      )}

      {result.teamsOwnerships.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('teamsOwnershipRequired', { count: result.teamsOwnerships.length })}
            {' '}
            <Link href={`/admin/offboarding/${starterId}/teams`} className="underline font-medium">
              {t('configureTeamsTransfer')}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {showOooWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            {t('oooTemplateMissing')}
            {hasPermission && entityId && jobRoleId && (
              <Button variant="link" size="sm" className="h-auto p-0 font-medium" onClick={() => setOooDialogOpen(true)}>
                {t('configureOooTemplate')}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {entityId && jobRoleId && (
        <OooTemplateDialog
          open={oooDialogOpen}
          onOpenChange={setOooDialogOpen}
          entityId={entityId}
          jobRoleId={jobRoleId}
          jobRoleTitle={jobRoleTitle || ''}
          onSaved={fetchPreflight}
        />
      )}
    </div>
  )
}
