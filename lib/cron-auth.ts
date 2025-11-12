/**
 * Cron Job Authentication Middleware
 * 
 * Beveiligt cron endpoints tegen ongeautoriseerde toegang.
 * Gebruikt CRON_SECRET environment variable voor verificatie.
 */

import { NextResponse } from 'next/server'

/**
 * Verify cron job authorization
 * 
 * Checks:
 * 1. Authorization header met "Bearer CRON_SECRET"
 * 2. Of query parameter ?secret=CRON_SECRET
 * 
 * Usage:
 * ```typescript
 * export async function GET(req: Request) {
 *   const authError = verifyCronAuth(req)
 *   if (authError) return authError
 *   
 *   // ... cron logic
 * }
 * ```
 */
export function verifyCronAuth(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET

  // Als CRON_SECRET niet is ingesteld, log een warning maar allow (backwards compatibility)
  if (!cronSecret) {
    console.warn('⚠️ CRON_SECRET is not set! Cron endpoints are publicly accessible.')
    return null
  }

  // Check Authorization header: "Bearer <secret>"
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    if (token === cronSecret) {
      return null // Authorized
    }
  }

  // Check query parameter: ?secret=<secret>
  const url = new URL(req.url)
  const secretParam = url.searchParams.get('secret')
  if (secretParam === cronSecret) {
    return null // Authorized
  }

  // Unauthorized
  console.error('🚫 Unauthorized cron job attempt:', {
    url: req.url,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json(
    { 
      error: 'Unauthorized',
      message: 'Invalid or missing CRON_SECRET. Please provide the secret via Authorization header or ?secret= query parameter.'
    },
    { status: 401 }
  )
}

/**
 * Generate a secure random secret for CRON_SECRET
 * 
 * Run this once and add to your .env:
 * ```bash
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * ```
 */
export function generateCronSecret(): string {
  return require('crypto').randomBytes(32).toString('hex')
}

