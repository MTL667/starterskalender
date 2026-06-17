'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface HandleMailboxButtonProps {
  starterId: string
  currentState?: string | null
  allClear: boolean
  hasPermission: boolean
  onStart: () => void
}

export function HandleMailboxButton({ starterId, currentState, allClear, hasPermission, onStart }: HandleMailboxButtonProps) {
  const [loading, setLoading] = useState(false)
  const t = useTranslations('offboarding')

  if (currentState === 'COMPLETED') {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">{t('completed')}</span>
      </div>
    )
  }

  if (!hasPermission) return null

  const isExecuting = currentState?.startsWith('EXECUTING_')
  const isBlocked = currentState?.startsWith('BLOCKED_AT_')

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/offboarding/${starterId}/start`, { method: 'POST' })
      if (res.ok) {
        onStart()
      }
    } finally {
      setLoading(false)
    }
  }

  if (isExecuting) {
    return (
      <Button disabled variant="outline" size="sm">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {t('inProgress')}
      </Button>
    )
  }

  return (
    <Button
      onClick={handleClick}
      disabled={!allClear || loading}
      variant="destructive"
      size="sm"
    >
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
      {t('handleMailbox')}
    </Button>
  )
}
