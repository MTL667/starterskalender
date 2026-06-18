'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { HandleMailboxButton } from './HandleMailboxButton'
import { PreFlightPanel } from './PreFlightPanel'
import { OffboardingStatus } from './OffboardingStatus'

interface OffboardingSectionProps {
  starterId: string
  hasPermission: boolean
  entityId?: string
  jobRoleId?: string
  jobRoleTitle?: string
}

export function OffboardingSection({ starterId, hasPermission, entityId, jobRoleId, jobRoleTitle }: OffboardingSectionProps) {
  const t = useTranslations('offboarding')
  const [allClear, setAllClear] = useState(false)
  const [currentState, setCurrentState] = useState<string | null>(null)
  const [showStatus, setShowStatus] = useState(false)

  const handlePreFlightResult = useCallback((result: { allClear: boolean }) => {
    setAllClear(result.allClear)
  }, [])

  const handleStart = () => {
    setShowStatus(true)
    setCurrentState('EXECUTING_OOO')
  }

  const handleStateChange = useCallback((state: string) => {
    setCurrentState(state)
  }, [])

  useEffect(() => {
    fetch(`/api/offboarding/${starterId}`)
      .then(res => res.json())
      .then(data => {
        if (data.job) {
          setCurrentState(data.job.state)
          if (data.job.state.startsWith('EXECUTING_') || data.job.state.startsWith('BLOCKED_AT_') || data.job.state === 'COMPLETED') {
            setShowStatus(true)
          }
        }
      })
      .catch(() => {})
  }, [starterId])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('sectionTitle')}</span>
      </div>

      <PreFlightPanel
        starterId={starterId}
        entityId={entityId}
        jobRoleId={jobRoleId}
        jobRoleTitle={jobRoleTitle}
        hasPermission={hasPermission}
        onResult={handlePreFlightResult}
      />

      <div className="flex items-center gap-3">
        <HandleMailboxButton
          starterId={starterId}
          currentState={currentState}
          allClear={allClear}
          hasPermission={hasPermission}
          onStart={handleStart}
        />
      </div>

      {showStatus && (
        <OffboardingStatus starterId={starterId} autoConnect={currentState?.startsWith('EXECUTING_')} onStateChange={handleStateChange} />
      )}
    </div>
  )
}
