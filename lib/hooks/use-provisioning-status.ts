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

  const connect = useCallback(() => {
    if (!starterId) return

    eventSourceRef.current?.close()

    const es = new EventSource(`/api/provisioning/${starterId}/status`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProvisioningStatus
        setStatus(data)
        if (!startedAt && ACTIVE_STATES.includes(data.state)) {
          setStartedAt(new Date())
        }
      } catch {}
    }

    es.onerror = () => {
      es.close()
      setTimeout(() => connect(), 3000)
    }
  }, [starterId, startedAt])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [connect])

  const reconnect = useCallback(() => {
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
