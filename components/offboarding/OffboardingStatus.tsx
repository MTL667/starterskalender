'use client'

import { useEffect } from 'react'
import { useOffboardingStatus } from '@/lib/hooks/use-offboarding-status'
import { CheckCircle2, XCircle, Circle, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

const STEPS = [
  { key: 'OOO', label: 'Out of Office' },
  { key: 'LOGIN_BLOCK', label: 'Login blokkeren' },
  { key: 'REVOKE_SESSIONS', label: 'Sessies intrekken' },
  { key: 'CALENDAR', label: 'Agenda annuleren' },
  { key: 'TEAMS_TRANSFER', label: 'Teams overdracht' },
  { key: 'GROUPS', label: 'Groepen verwijderen' },
  { key: 'FORWARDING', label: 'Doorstuurregels' },
  { key: 'DELEGATES', label: 'Machtigingen' },
  { key: 'SIZE_CHECK', label: 'Grootte controle' },
  { key: 'CONVERSION', label: 'Shared mailbox' },
  { key: 'LICENSE_REMOVAL', label: 'Licentie verwijderen' },
]

interface OffboardingStatusProps {
  starterId: string
  autoConnect?: boolean
  onRetry?: () => void
}

export function OffboardingStatus({ starterId, autoConnect = false, onRetry }: OffboardingStatusProps) {
  const { status, isActive, isBlocked, isCompleted, reconnect } = useOffboardingStatus(starterId)
  const t = useTranslations('offboarding')

  useEffect(() => {
    if (autoConnect) reconnect()
  }, [autoConnect, reconnect])

  if (!status) return null

  const currentStep = status.step || 0

  const handleRetry = async () => {
    const res = await fetch(`/api/offboarding/${starterId}/retry`, { method: 'POST' })
    if (res.ok) {
      reconnect()
      onRetry?.()
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {STEPS.map((step, index) => {
          const stepNum = index + 1
          const isCurrentStep = stepNum === currentStep
          const isDone = stepNum < currentStep || isCompleted
          const isFailed = isBlocked && stepNum === currentStep

          let icon
          if (isDone) icon = <CheckCircle2 className="h-4 w-4 text-green-500" />
          else if (isFailed) icon = <XCircle className="h-4 w-4 text-red-500" />
          else if (isCurrentStep && isActive) icon = <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          else icon = <Circle className="h-4 w-4 text-muted-foreground/30" />

          return (
            <div key={step.key} className={`flex items-center gap-2 text-sm ${isFailed ? 'text-red-600 font-medium' : isDone ? 'text-muted-foreground' : ''}`}>
              {icon}
              <span>{step.label}</span>
              {isFailed && status.error && (
                <span className="text-xs text-red-500 ml-2">— {status.error}</span>
              )}
            </div>
          )
        })}
      </div>

      {isBlocked && (
        <Button onClick={handleRetry} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('retry')}
        </Button>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {t('allStepsCompleted')}
        </div>
      )}
    </div>
  )
}
