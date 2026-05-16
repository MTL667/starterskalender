'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Rocket, Eye, EyeOff, XCircle, RotateCcw } from 'lucide-react'
import type { VacancyPublishValidationError } from '@/lib/recruitment/types'

interface VacancyStatusActionsProps {
  vacancyId: string
  status: string
  onStatusChange: (newStatus: string) => void
}

export function VacancyStatusActions({ vacancyId, status, onStatusChange }: VacancyStatusActionsProps) {
  const t = useTranslations('recruitment')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<VacancyPublishValidationError[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const performAction = useCallback(async (action: 'publish' | 'unpublish' | 'close') => {
    setLoading(true)
    setValidationErrors([])
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (result.error?.code === 'PUBLISH_VALIDATION') {
          setValidationErrors(result.error.validationErrors ?? [])
        } else {
          setErrorMessage(result.error?.message ?? t('publish.errorGeneric'))
        }
        return
      }

      onStatusChange(result.data.status)
      setSuccessMessage(
        action === 'publish' ? t('publish.successPublished') :
        action === 'unpublish' ? t('publish.successUnpublished') :
        t('publish.successClosed')
      )
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 4000)
    } catch {
      setErrorMessage(t('publish.errorNetwork'))
    } finally {
      setLoading(false)
    }
  }, [vacancyId, onStatusChange, t])

  const handleClose = useCallback(() => {
    setShowCloseDialog(false)
    performAction('close')
  }, [performAction])

  const statusBadge = () => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">{t('statusDraft')}</Badge>
      case 'PUBLISHED': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('statusPublished')}</Badge>
      case 'CLOSED': return <Badge variant="outline">{t('statusClosed')}</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {statusBadge()}

        {status === 'DRAFT' && (
          <Button onClick={() => performAction('publish')} disabled={loading}>
            <Rocket className="h-4 w-4 mr-1.5" />
            {loading ? t('publish.publishing') : t('publish.publish')}
          </Button>
        )}

        {status === 'PUBLISHED' && (
          <>
            <Button variant="outline" onClick={() => performAction('unpublish')} disabled={loading}>
              <EyeOff className="h-4 w-4 mr-1.5" />
              {t('publish.unpublish')}
            </Button>
            <Button variant="destructive" onClick={() => setShowCloseDialog(true)} disabled={loading}>
              <XCircle className="h-4 w-4 mr-1.5" />
              {t('publish.close')}
            </Button>
          </>
        )}

        {status === 'CLOSED' && (
          <Button variant="outline" onClick={() => performAction('unpublish')} disabled={loading}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            {t('publish.reopen')}
          </Button>
        )}

        {successMessage && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {successMessage}
          </span>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-1">
          <p className="text-sm font-medium text-destructive">{t('publish.validationTitle')}</p>
          <ul className="text-sm text-destructive list-disc list-inside">
            {validationErrors.map((err) => (
              <li key={err.field}>{t(`publish.missing_${err.field}`)}</li>
            ))}
          </ul>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('publish.closeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('publish.closeConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('publish.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>{t('publish.confirmClose')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
