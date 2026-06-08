'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle, Circle, Loader2 } from 'lucide-react'

type ProvisioningState =
  | 'NONE'
  | 'PENDING'
  | 'LICENSE_CHECKING'
  | 'USER_CREATING'
  | 'LICENSE_ASSIGNING'
  | 'TAP_CREATING'
  | 'MAILBOX_WAITING'
  | 'SUCCESS'
  | 'FAILED_AT_LICENSE_CHECK'
  | 'FAILED_AT_USER_CREATION'
  | 'FAILED_AT_LICENSE_ASSIGNMENT'
  | 'FAILED_AT_TAP'
  | 'FAILED_AT_MAILBOX_WAIT'

interface ProvisioningStatusProps {
  state: ProvisioningState
  error?: string | null
  startedAt?: Date | null
  assignedLicenseType?: string | null
}

const STEPS = [
  { key: 'LICENSE_CHECKING', failKey: 'FAILED_AT_LICENSE_CHECK' },
  { key: 'USER_CREATING', failKey: 'FAILED_AT_USER_CREATION' },
  { key: 'LICENSE_ASSIGNING', failKey: 'FAILED_AT_LICENSE_ASSIGNMENT' },
  { key: 'TAP_CREATING', failKey: 'FAILED_AT_TAP' },
] as const

function getStepStatus(stepKey: string, failKey: string, currentState: ProvisioningState) {
  const stepOrder = STEPS.map(s => s.key)
  const currentIdx = stepOrder.indexOf(currentState as any)
  const stepIdx = stepOrder.indexOf(stepKey as any)

  if (currentState === failKey) return 'failed'
  if (currentState === 'SUCCESS') return 'complete'
  if (currentIdx > stepIdx) return 'complete'
  if (currentIdx === stepIdx) return 'active'
  return 'pending'
}

export function ProvisioningStatus({ state, error, startedAt, assignedLicenseType }: ProvisioningStatusProps) {
  const t = useTranslations('entra.provisioning')

  if (state === 'NONE' || state === 'PENDING') return null

  const elapsedSeconds = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0
  const showSlowMessage = elapsedSeconds > 60

  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <ul className="space-y-2">
        {STEPS.map(({ key, failKey }) => {
          const stepStatus = getStepStatus(key, failKey, state)
          return (
            <li key={key} className="flex items-center gap-2">
              {stepStatus === 'complete' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {stepStatus === 'active' && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
              {stepStatus === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
              {stepStatus === 'pending' && <Circle className="h-4 w-4 text-muted-foreground" />}
              <span className={stepStatus === 'active' ? 'font-medium' : stepStatus === 'failed' ? 'text-red-600' : ''}>
                {t(`steps.${key}`)}
              </span>
            </li>
          )
        })}
      </ul>

      {assignedLicenseType && (
        <p className="text-sm text-muted-foreground">
          {t('assignedLicense', { type: assignedLicenseType })}
        </p>
      )}

      {showSlowMessage && !state.startsWith('FAILED_') && state !== 'SUCCESS' && (
        <p className="text-sm text-amber-600">
          {t('slowMessage')}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
