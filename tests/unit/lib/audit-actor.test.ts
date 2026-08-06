import { describe, it, expect } from 'vitest'
import { resolveActorId } from '@/lib/audit'

describe('resolveActorId', () => {
  it('maps system placeholders to null', () => {
    expect(resolveActorId('system')).toBeNull()
    expect(resolveActorId('SYSTEM')).toBeNull()
    expect(resolveActorId(' System ')).toBeNull()
  })

  it('maps missing actor to null', () => {
    expect(resolveActorId(undefined)).toBeNull()
    expect(resolveActorId('')).toBeNull()
  })

  it('keeps real user ids', () => {
    expect(resolveActorId('clxxxxxxxxxxxxxxxxxx')).toBe('clxxxxxxxxxxxxxxxxxx')
  })
})
