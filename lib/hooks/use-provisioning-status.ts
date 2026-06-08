'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type ProvisioningState =
  | 'NONE'
  | 'PENDING'
  | 'LICENSE_CHECKING'
  | 'USER_CREATING'
  | 'LICENSE_ASSIGNING'
  | 'MAILBOX_WAITING'
  | 'SUCCESS'
  | 'FAILED_AT_LICENSE_CHECK'
  | 'FAILED_AT_USER_CREATION'
  | 'FAILED_AT_LICENSE_ASSIGNMENT'
  | 'FAILED_AT_MAILBOX_WAIT'

interface ProvisioningStatus {
  id?: string
  state: ProvisioningState
  error?: string | null
  assignedLicenseType?: string | null
  completedAt?: string | null
  temporaryPassword?: string | null
}

interface UseProvisioningStatusReturn {
  status: ProvisioningStatus
  isActive: boolean
  isFailed: boolean
  isSuccess: boolean
  startedAt: Date | null
  reconnect: () => void
}

const TERMINAL_STATES: ProvisioningState[] = [
  'SUCCESS',
  'FAILED_AT_LICENSE_CHECK',
  'FAILED_AT_USER_CREATION',
  'FAILED_AT_LICENSE_ASSIGNMENT',
  'FAILED_AT_MAILBOX_WAIT',
]

const ACTIVE_STATES: ProvisioningState[] = [
  'PENDING',
  'LICENSE_CHECKING',
  'USER_CREATING',
  'LICENSE_ASSIGNING',
  'MAILBOX_WAITING',
]

export function useProvisioningStatus(starterId: string | null): UseProvisioningStatusReturn {
  const [status, setStatus] = useState<ProvisioningStatus>({ state: 'NONE' })
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const startedAtRef = useRef<Date | null>(null)
  const lastStateRef = useRef<ProvisioningState>('NONE')
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!starterId) return

    eventSourceRef.current?.close()
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    const es = new EventSource(`/api/provisioning/${starterId}/status`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProvisioningStatus
        setStatus(data)
        lastStateRef.current = data.state
        if (ACTIVE_STATES.includes(data.state) && !startedAtRef.current) {
          const now = new Date()
          startedAtRef.current = now
          setStartedAt(now)
        }
        if (data.state === 'NONE' || TERMINAL_STATES.includes(data.state)) {
          es.close()
          eventSourceRef.current = null
        }
      } catch {}
    }

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      if (ACTIVE_STATES.includes(lastStateRef.current)) {
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
    lastStateRef.current = 'PENDING'
    connect()
  }, [connect])

  return {
    status,
    isActive: ACTIVE_STATES.includes(status.state),
    isFailed: status.state.startsWith('FAILED_'),
    isSuccess: status.state === 'SUCCESS',
    startedAt,
    reconnect,
  }
}
