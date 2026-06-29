'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

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

interface OooForm {
  oooMessageNl: string
  oooMessageFr: string
  oooMessageEn: string
  oooGeneralMailAddress: string
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
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const t = useTranslations('offboarding')

  const [oooExpanded, setOooExpanded] = useState(false)
  const [oooForm, setOooForm] = useState<OooForm>({ oooMessageNl: '', oooMessageFr: '', oooMessageEn: '', oooGeneralMailAddress: '' })
  const [oooLoading, setOooLoading] = useState(false)
  const [oooSaving, setOooSaving] = useState(false)
  const [oooSaved, setOooSaved] = useState(false)
  const [oooLoaded, setOooLoaded] = useState(false)
  const [showError, setShowError] = useState<string | null>(null)

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
    setOooExpanded(false)
    setOooForm({ oooMessageNl: '', oooMessageFr: '', oooMessageEn: '', oooGeneralMailAddress: '' })
    setOooLoaded(false)
    setOooSaved(false)
    setShowError(null)
  }, [fetchPreflight])

  const loadOooData = useCallback(async () => {
    if (oooLoaded) return
    setOooLoading(true)
    try {
      const res = await fetch(`/api/offboarding/${starterId}/ooo`)
      if (res.ok) {
        const data = await res.json()
        const hasData = data.oooMessageNl || data.oooMessageFr || data.oooMessageEn
        if (hasData) {
          setOooForm({
            oooMessageNl: data.oooMessageNl || '',
            oooMessageFr: data.oooMessageFr || '',
            oooMessageEn: data.oooMessageEn || '',
            oooGeneralMailAddress: data.oooGeneralMailAddress || '',
          })
        } else if (entityId && jobRoleId) {
          const templateRes = await fetch(`/api/admin/ooo-templates/${entityId}/${jobRoleId}`)
          if (templateRes.ok) {
            const tmpl = await templateRes.json()
            setOooForm({
              oooMessageNl: tmpl.templateNl || '',
              oooMessageFr: tmpl.templateFr || '',
              oooMessageEn: tmpl.templateEn || '',
              oooGeneralMailAddress: tmpl.generalMailAddress || '',
            })
          }
        }
        setOooLoaded(true)
      }
    } catch { /* ignore */ } finally {
      setOooLoading(false)
    }
  }, [starterId, entityId, jobRoleId, oooLoaded])

  const handleExpandOoo = () => {
    const next = !oooExpanded
    setOooExpanded(next)
    if (next) loadOooData()
  }

  const handleSaveOoo = async () => {
    setOooSaving(true)
    setOooSaved(false)
    setShowError(null)
    try {
      const res = await fetch(`/api/offboarding/${starterId}/ooo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oooForm),
      })
      if (res.ok) {
        setOooSaved(true)
        setTimeout(() => setOooSaved(false), 3000)
        fetchPreflight()
      } else {
        const data = await res.json().catch(() => ({}))
        setShowError(data.error || `Save failed (${res.status})`)
      }
    } catch {
      setShowError('Network error')
    } finally {
      setOooSaving(false)
    }
  }

  const handleClearOoo = async () => {
    setOooSaving(true)
    setShowError(null)
    try {
      const res = await fetch(`/api/offboarding/${starterId}/ooo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oooMessageNl: null, oooMessageFr: null, oooMessageEn: null, oooGeneralMailAddress: null }),
      })
      if (res.ok) {
        setOooForm({ oooMessageNl: '', oooMessageFr: '', oooMessageEn: '', oooGeneralMailAddress: '' })
        fetchPreflight()
      }
    } catch { /* ignore */ } finally {
      setOooSaving(false)
    }
  }

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

  const hasOooContent = !!(oooForm.oooMessageNl || oooForm.oooMessageFr || oooForm.oooMessageEn)
  const isAllGreen = result.allClear && !showOooWarning

  return (
    <div className="space-y-2">
      {isAllGreen && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          {t('readyForOffboarding')}
        </div>
      )}
      {!isAllGreen && !result.graphApiHealthy && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {t('graphApiUnavailable')}{result.graphApiError ? `: ${result.graphApiError}` : ''}
          </AlertDescription>
        </Alert>
      )}

      {!isAllGreen && result.litigationHold && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{t('litigationHoldDetected')}</AlertDescription>
        </Alert>
      )}

      {!isAllGreen && result.mailboxSizeMb >= 50000 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('mailboxTooLarge', { sizeMb: Math.round(result.mailboxSizeMb) })}
          </AlertDescription>
        </Alert>
      )}

      {!isAllGreen && result.teamsOwnerships.length > 0 && (
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
            {hasPermission && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 font-medium"
                onClick={handleExpandOoo}
              >
                {t('writeOooForStarter')}
                {oooExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!showOooWarning && hasPermission && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={handleExpandOoo}
        >
          {t('editOooForStarter')}
          {oooExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      )}

      {oooExpanded && (
        <div className="space-y-3 p-3 border rounded-md bg-muted/30">
          {oooLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{t('oooEditorDescription')}</p>

              <div>
                <Label htmlFor="ooo-generalMail" className="text-xs">{t('oooGeneralMailAddressLabel')}</Label>
                <Input
                  id="ooo-generalMail"
                  type="email"
                  value={oooForm.oooGeneralMailAddress}
                  onChange={(e) => setOooForm(prev => ({ ...prev, oooGeneralMailAddress: e.target.value }))}
                  placeholder="info@company.be"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ooo-nl" className="text-xs">OOO (NL)</Label>
                <Textarea
                  id="ooo-nl"
                  value={oooForm.oooMessageNl}
                  onChange={(e) => setOooForm(prev => ({ ...prev, oooMessageNl: e.target.value }))}
                  rows={3}
                  className="mt-1"
                  placeholder={t('oooPlaceholderNl')}
                />
              </div>

              <div>
                <Label htmlFor="ooo-fr" className="text-xs">OOO (FR)</Label>
                <Textarea
                  id="ooo-fr"
                  value={oooForm.oooMessageFr}
                  onChange={(e) => setOooForm(prev => ({ ...prev, oooMessageFr: e.target.value }))}
                  rows={3}
                  className="mt-1"
                  placeholder={t('oooPlaceholderFr')}
                />
              </div>

              <div>
                <Label htmlFor="ooo-en" className="text-xs">OOO (EN)</Label>
                <Textarea
                  id="ooo-en"
                  value={oooForm.oooMessageEn}
                  onChange={(e) => setOooForm(prev => ({ ...prev, oooMessageEn: e.target.value }))}
                  rows={3}
                  className="mt-1"
                  placeholder={t('oooPlaceholderEn')}
                />
              </div>

              <p className="text-xs text-muted-foreground">{t('oooVariablesHint')}</p>

              {showError && <p className="text-xs text-destructive">{showError}</p>}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveOoo}
                  disabled={oooSaving || !hasOooContent}
                >
                  {oooSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                  {t('oooSaveButton')}
                </Button>
                {hasOooContent && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearOoo}
                    disabled={oooSaving}
                    className="text-destructive hover:text-destructive"
                  >
                    {t('oooClearButton')}
                  </Button>
                )}
                {oooSaved && <span className="text-xs text-green-600">{t('oooSaved')}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
