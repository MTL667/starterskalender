'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { SSEEvent, SSEEventType } from '@/lib/events'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

type EventHandler = (event: SSEEvent) => void

interface SSEContextValue {
  status: ConnectionStatus
  subscribe: (eventType: string, handler: EventHandler) => () => void
}

const SSEContext = createContext<SSEContextValue>({
  status: 'disconnected',
  subscribe: () => () => {},
})

export function useSSE(eventPattern: string, handler: EventHandler) {
  const { subscribe } = useContext(SSEContext)
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const stableHandler: EventHandler = (event) => handlerRef.current(event)
    return subscribe(eventPattern, stableHandler)
  }, [subscribe, eventPattern])
}

export function useSSEStatus(): ConnectionStatus {
  return useContext(SSEContext).status
}

function matchesPattern(eventType: string, pattern: string): boolean {
  if (pattern === '*') return true
  if (pattern.endsWith(':*')) {
    return eventType.startsWith(pattern.slice(0, -1))
  }
  return eventType === pattern
}

export function SSEProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const handlersRef = useRef(new Map<string, Set<EventHandler>>())
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const dispatch = useCallback((event: SSEEvent) => {
    for (const [pattern, handlers] of handlersRef.current.entries()) {
      if (matchesPattern(event.type, pattern)) {
        handlers.forEach((h) => h(event))
      }
    }
  }, [])

  const subscribe = useCallback(
    (eventPattern: string, handler: EventHandler) => {
      if (!handlersRef.current.has(eventPattern)) {
        handlersRef.current.set(eventPattern, new Set())
      }
      handlersRef.current.get(eventPattern)!.add(handler)

      return () => {
        const set = handlersRef.current.get(eventPattern)
        if (set) {
          set.delete(handler)
          if (set.size === 0) handlersRef.current.delete(eventPattern)
        }
      }
    },
    []
  )

  useEffect(() => {
    let mounted = true

    function connect() {
      if (!mounted) return

      const es = new EventSource('/api/sse')
      eventSourceRef.current = es

      es.onopen = () => {
        if (!mounted) return
        const wasReconnecting = reconnectAttempts.current > 0
        reconnectAttempts.current = 0
        setStatus('connected')

        if (wasReconnecting) {
          for (const handlers of handlersRef.current.values()) {
            handlers.forEach((h) => {
              try { h({ type: 'starter:updated', entityId: '*', payload: { reconnect: true } }) } catch {}
            })
          }
        }
      }

      const eventTypes: SSEEventType[] = [
        'starter:created',
        'starter:updated',
        'starter:deleted',
        'task:created',
        'task:updated',
        'task:completed',
        'notification:new',
      ]

      for (const type of eventTypes) {
        es.addEventListener(type, (e: MessageEvent) => {
          if (!mounted) return
          try {
            const event: SSEEvent = JSON.parse(e.data)
            dispatch(event)
          } catch { /* ignore malformed events */ }
        })
      }

      es.onerror = () => {
        if (!mounted) return
        es.close()
        eventSourceRef.current = null

        reconnectAttempts.current++
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setStatus('disconnected')
          return
        }

        setStatus('reconnecting')
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000)
        setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      mounted = false
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [dispatch])

  return (
    <SSEContext.Provider value={{ status, subscribe }}>
      {children}
    </SSEContext.Provider>
  )
}
