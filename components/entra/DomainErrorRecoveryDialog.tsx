'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type HealthyEntity = {
  id: string
  name: string
}

type AvailableSku = {
  skuId: string
  displayName: string
  availableUnits: number
}

type LicenseOptions = {
  mappedSku: { skuId: string; skuDisplayName: string } | null
  mappedSkuAvailable: boolean
  needsLicenseSelection: boolean
  availableSkus: AvailableSku[]
}

interface DomainErrorRecoveryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  starterId: string
  starterEntityId: string
  onConfirmOtherTenant: (payload: {
    provisioningEntityId: string
    licenseSkuId?: string
    licenseSkuDisplayName?: string
  }) => Promise<void>
  onEditEmail: () => void
}

export function DomainErrorRecoveryDialog({
  open,
  onOpenChange,
  starterId,
  starterEntityId,
  onConfirmOtherTenant,
  onEditEmail,
}: DomainErrorRecoveryDialogProps) {
  const t = useTranslations('entra.provisioning.domainRecovery')
  const [mode, setMode] = useState<'choose' | 'tenant'>('choose')
  const [entities, setEntities] = useState<HealthyEntity[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const [licenseOptions, setLicenseOptions] = useState<LicenseOptions | null>(null)
  const [loadingLicenses, setLoadingLicenses] = useState(false)
  const [selectedSkuId, setSelectedSkuId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setMode('choose')
    setSelectedEntityId('')
    setLicenseOptions(null)
    setSelectedSkuId('')
    setSubmitting(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    const ac = new AbortController()
    setLoadingEntities(true)
    setError(null)
    fetch('/api/entities?includeEntra=true', { signal: ac.signal })
      .then(async res => {
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed')
        if (!Array.isArray(data)) throw new Error('Unexpected entities response')
        const healthy = data
          .filter((e: { id: string; name: string; entraAppConnection?: { consentStatus?: string } | null }) =>
            e.entraAppConnection?.consentStatus === 'healthy' && e.id !== starterEntityId
          )
          .map((e: { id: string; name: string }) => ({ id: e.id, name: e.name }))
        setEntities(healthy)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(t('loadEntitiesError'))
        setEntities([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingEntities(false)
      })
    return () => ac.abort()
  }, [open, reset, starterEntityId, t])

  useEffect(() => {
    if (!selectedEntityId) {
      setLicenseOptions(null)
      setSelectedSkuId('')
      return
    }
    const ac = new AbortController()
    const entityIdForRequest = selectedEntityId
    setLoadingLicenses(true)
    setLicenseOptions(null)
    setSelectedSkuId('')
    setError(null)
    fetch(
      `/api/provisioning/${starterId}/license-options?entityId=${encodeURIComponent(entityIdForRequest)}`,
      { signal: ac.signal }
    )
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed')
        if (ac.signal.aborted) return
        setLicenseOptions(data)
        if (data.mappedSkuAvailable && data.mappedSku) {
          setSelectedSkuId(data.mappedSku.skuId)
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(t('loadLicensesError'))
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingLicenses(false)
      })
    return () => ac.abort()
  }, [selectedEntityId, starterId, t])

  const canConfirm =
    Boolean(selectedEntityId) &&
    !loadingLicenses &&
    licenseOptions &&
    (
      !licenseOptions.needsLicenseSelection ||
      Boolean(selectedSkuId)
    ) &&
    !(licenseOptions.needsLicenseSelection && licenseOptions.availableSkus.length === 0)

  const handleConfirm = async () => {
    if (!selectedEntityId || !licenseOptions) return
    setSubmitting(true)
    setError(null)
    try {
      let licenseSkuId: string | undefined
      let licenseSkuDisplayName: string | undefined

      if (licenseOptions.needsLicenseSelection) {
        const sku = licenseOptions.availableSkus.find(s => s.skuId === selectedSkuId)
        if (!sku) throw new Error(t('selectLicenseRequired'))
        licenseSkuId = sku.skuId
        licenseSkuDisplayName = sku.displayName
      } else if (licenseOptions.mappedSku) {
        licenseSkuId = licenseOptions.mappedSku.skuId
        licenseSkuDisplayName = licenseOptions.mappedSku.skuDisplayName
      }

      await onConfirmOtherTenant({
        provisioningEntityId: selectedEntityId,
        licenseSkuId,
        licenseSkuDisplayName,
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || t('submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {mode === 'choose' && (
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={() => setMode('tenant')}
              disabled={loadingEntities || entities.length === 0}
            >
              {loadingEntities && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('otherTenant')}
            </Button>
            {!loadingEntities && entities.length === 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-300">{t('noOtherTenants')}</p>
            )}
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                onEditEmail()
              }}
            >
              {t('editEmail')}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
          </div>
        )}

        {mode === 'tenant' && (
          <div className="space-y-4">
            {loadingEntities ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('loadingEntities')}
              </div>
            ) : entities.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">{t('noOtherTenants')}</p>
            ) : (
              <div className="space-y-2">
                <Label>{t('selectTenant')}</Label>
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectTenantPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedEntityId && loadingLicenses && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('loadingLicenses')}
              </div>
            )}

            {licenseOptions && !licenseOptions.needsLicenseSelection && licenseOptions.mappedSku && (
              <p className="text-sm text-muted-foreground">
                {t('mappedLicenseOk', { license: licenseOptions.mappedSku.skuDisplayName })}
              </p>
            )}

            {licenseOptions?.needsLicenseSelection && (
              <div className="space-y-2">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {licenseOptions.mappedSku
                    ? t('mappedLicenseMissing', { license: licenseOptions.mappedSku.skuDisplayName })
                    : t('mappedLicenseUnknown')}
                </p>
                {licenseOptions.availableSkus.length === 0 ? (
                  <p className="text-sm text-red-600">{t('noAvailableLicenses')}</p>
                ) : (
                  <>
                    <Label>{t('selectLicense')}</Label>
                    <Select value={selectedSkuId} onValueChange={setSelectedSkuId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectLicensePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {licenseOptions.availableSkus.map(sku => (
                          <SelectItem key={sku.skuId} value={sku.skuId}>
                            {sku.displayName} ({sku.availableUnits})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setMode('choose')} disabled={submitting}>
                {t('back')}
              </Button>
              <Button onClick={handleConfirm} disabled={!canConfirm || submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('confirm')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
