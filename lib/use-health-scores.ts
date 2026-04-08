'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSSE } from '@/components/providers/sse-provider'
import type { StarterHealthScore } from '@/app/api/stats/health/route'

export function useHealthScores(starterIds: string[]) {
  const [scores, setScores] = useState<Record<string, StarterHealthScore>>({})
  const [loading, setLoading] = useState(true)
  const idsRef = useRef<string[]>([])

  const fetchScores = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setScores({})
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/stats/health?starterIds=${ids.join(',')}`)
      if (res.ok) {
        const data = await res.json()
        setScores(data)
      }
    } catch (err) {
      console.error('Error fetching health scores:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const sorted = [...starterIds].sort()
    const prev = [...idsRef.current].sort()
    if (sorted.join(',') !== prev.join(',')) {
      idsRef.current = starterIds
      setLoading(true)
      fetchScores(starterIds)
    }
  }, [starterIds, fetchScores])

  useSSE('task:*', () => {
    if (idsRef.current.length > 0) {
      fetchScores(idsRef.current)
    }
  })

  useSSE('starter:*', () => {
    if (idsRef.current.length > 0) {
      fetchScores(idsRef.current)
    }
  })

  return { scores, loading }
}
