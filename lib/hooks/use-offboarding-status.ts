'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type OffboardingState =
  | 'NONE'
  | 'PENDING'
  | 'READY'
  | 'TEAMS_TRANSFER_PENDING'
  | 'EXECUTING_OOO'
  | 'EXECUTING_LOGIN_BLOCK'
  | 'EXECUTING_REVOKE_SESSIONS'
  | 'EXECUTING_CALENDAR'
  | 'EXECUTING_TEAMS_TRANSFER'
  | 'EXECUTING_GROUPS'
  | 'EXECUTING_FORWARDING'
  | 'EXECUTING_DELEGATES'
  | 'EXECUTING_SIZE_CHECK'
  | 'EXECUTING_CONVERSION'
  | 'EXECUTING_LICENSE_REMOVAL'
  | 'BLOCKED_AT_OOO'
  | 'BLOCKED_AT_LOGIN_BLOCK'
  | 'BLOCKED_AT_REVOKE_SESSIONS'
  | 'BLOCKED_AT_CALENDAR'
  | 'BLOCKED_AT_TEAMS_TRANSFER'
  | 'BLOCKED_AT_GROUPS'
  | 'BLOCKED_AT_FORWARDING'
  | 'BLOCKED_AT_DELEGATES'
  | 'BLOCKED_AT_SIZE_CHECK'
  | 'BLOCKED_AT_CONVERSION'
  | 'BLOCKED_AT_LICENSE_REMOVAL'
  | 'COMPLETED'
  | 'ROLLED_BACK'

interface OffboardingStatus {
  state: OffboardingState
  step: number
  totalSteps: number
  message: string
  timestamp: string
  error?: string
}

interface UseOffboardingStatusReturn {
  status: OffboardingStatus | null
  isActive: boolean
  isBlocked: boolean
  isCompleted: boolean
  reconnect: () => void
}

const EXECUTING_STATES = [
  'EXECUTING_OOO', 'EXECUTING_LOGIN_BLOCK', 'EXECUTING_REVOKE_SESSIONS',
  'EXECUTING_CALENDAR', 'EXECUTING_TEAMS_TRANSFER', 'EXECUTING_GROUPS',
  'EXECUTING_FORWARDING', 'EXECUTING_DELEGATES', 'EXECUTING_SIZE_CHECK',
  'EXECUTING_CONVERSION', 'EXECUTING_LICENSE_REMOVAL',
]

export function useOffboardingStatus(starterId: string | null): UseOffboardingStatusReturn {
  const [status, setStatus] = useState<OffboardingStatus | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const lastStateRef = useRef<OffboardingState>('NONE')
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!starterId) return

    eventSourceRef.current?.close()
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    const es = new EventSource(`/api/offboarding/${starterId}/status`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as OffboardingStatus
        setStatus(data)
        lastStateRef.current = data.state

        if (data.state === 'NONE' || data.state === 'COMPLETED' ||
            data.state === 'ROLLED_BACK' || data.state.startsWith('BLOCKED_AT_')) {
          es.close()
          eventSourceRef.current = null
        }
      } catch {}
    }

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      if (EXECUTING_STATES.includes(lastStateRef.current)) {
        retryTimeoutRef.current = setTimeout(() => connect(), 2000)
      }
    }
  }, [starterId])

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  const reconnect = useCallback(() => {
    lastStateRef.current = 'EXECUTING_OOO'
    connect()
  }, [connect])

  return {
    status,
    isActive: EXECUTING_STATES.includes(status?.state || ''),
    isBlocked: (status?.state || '').startsWith('BLOCKED_AT_'),
    isCompleted: status?.state === 'COMPLETED',
    reconnect,
  }
}
