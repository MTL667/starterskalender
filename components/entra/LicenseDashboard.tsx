'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface LicenseCacheEntry {
  skuPartNumber: string
  displayName: string
  totalUnits: number
  consumedUnits: number
  availableUnits: number
  lastSyncedAt: string
}

interface LicenseDashboardProps {
  entityId: string
}

function getCapacityColor(available: number, total: number): string {
  if (total === 0) return 'bg-gray-200'
  const pct = available / total
  if (pct > 0.2) return 'bg-green-500'
  if (pct > 0.05) return 'bg-amber-500'
  return 'bg-red-500'
}

export function LicenseDashboard({ entityId }: LicenseDashboardProps) {
  const t = useTranslations('entra.license')
  const [licenses, setLicenses] = useState<LicenseCacheEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLicenses() {
      try {
        const res = await fetch(`/api/admin/license-cache/${entityId}`)
        if (res.ok) {
          const data = await res.json()
          setLicenses(data.licenses)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchLicenses()
  }, [entityId])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-muted animate-pulse rounded-md" />
        <div className="h-20 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  if (licenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('emptyState')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {licenses.map((lic) => {
        const usedPct = lic.totalUnits > 0 ? (lic.consumedUnits / lic.totalUnits) * 100 : 0
        const color = getCapacityColor(lic.availableUnits, lic.totalUnits)

        return (
          <div key={lic.skuPartNumber} className="border rounded-md p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{lic.skuPartNumber}</span>
              <span className="text-sm text-muted-foreground">
                {lic.availableUnits} / {lic.totalUnits} {t('available')}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('lastSync', { date: new Date(lic.lastSyncedAt).toLocaleString() })}
            </p>
          </div>
        )
      })}
    </div>
  )
}
