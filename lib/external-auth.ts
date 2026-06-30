import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

export function validateExternalApiKey(req: NextRequest): boolean {
  const key = process.env.EXTERNAL_API_KEY
  if (!key) return false

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const provided = authHeader.slice(7)
  if (provided.length !== key.length) return false

  return timingSafeEqual(Buffer.from(provided), Buffer.from(key))
}
