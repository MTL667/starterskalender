import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GraphApiError,
  GraphAuthError,
  GraphTransientError,
  GraphRateLimitError,
} from '@/lib/graph-api-service'

describe('lib/graph-api-service', () => {
  describe('Error hierarchy', () => {
    it('GraphApiError is base error with retryable flag', () => {
      const err = new GraphApiError('test', false)
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('GraphApiError')
      expect(err.retryable).toBe(false)
    })

    it('GraphAuthError is not retryable', () => {
      const err = new GraphAuthError('auth failed')
      expect(err).toBeInstanceOf(GraphApiError)
      expect(err.name).toBe('GraphAuthError')
      expect(err.retryable).toBe(false)
    })

    it('GraphTransientError is retryable', () => {
      const err = new GraphTransientError('timeout')
      expect(err).toBeInstanceOf(GraphApiError)
      expect(err.name).toBe('GraphTransientError')
      expect(err.retryable).toBe(true)
    })

    it('GraphRateLimitError is retryable with retry duration', () => {
      const err = new GraphRateLimitError('rate limited', 5000)
      expect(err).toBeInstanceOf(GraphApiError)
      expect(err.name).toBe('GraphRateLimitError')
      expect(err.retryable).toBe(true)
      expect(err.retryAfterMs).toBe(5000)
    })
  })

  describe('Error classification', () => {
    it('distinguishes auth errors from transient errors', () => {
      const authErr = new GraphAuthError('consent revoked')
      const transientErr = new GraphTransientError('503 server error')

      expect(authErr instanceof GraphAuthError).toBe(true)
      expect(authErr instanceof GraphTransientError).toBe(false)
      expect(transientErr instanceof GraphTransientError).toBe(true)
      expect(transientErr instanceof GraphAuthError).toBe(false)
    })

    it('all errors extend GraphApiError base', () => {
      expect(new GraphAuthError('x')).toBeInstanceOf(GraphApiError)
      expect(new GraphTransientError('x')).toBeInstanceOf(GraphApiError)
      expect(new GraphRateLimitError('x', 1000)).toBeInstanceOf(GraphApiError)
    })
  })
})
