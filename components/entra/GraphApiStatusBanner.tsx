'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

interface GraphApiStatusBannerProps {
  entityId: string
}

export function GraphApiStatusBanner({ entityId }: GraphApiStatusBannerProps) {
  const t = useTranslations('entra.graphStatus')
  const [unreachable, setUnreachable] = useState(false)

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/admin/graph-status/${entityId}`)
        if (res.ok) {
          const data = await res.json()
          setUnreachable(!data.isReachable)
        }
      } catch {}
    }
    checkStatus()
  }, [entityId])

  if (!unreachable) return null

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-amber-800">
        {t('unreachable')}
      </p>
    </div>
  )
}
