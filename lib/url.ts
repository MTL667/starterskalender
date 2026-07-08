/**
 * Canonical app URL for absolute links in emails, webhooks, etc.
 * Falls back through APP_URL → NEXTAUTH_URL → hardcoded default.
 */
export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://airport.hertbelgium.be'
  )
}

/**
 * Internal URL for server-to-server calls within the container.
 */
export function getInternalUrl(): string {
  return (
    process.env.NEXTAUTH_URL_INTERNAL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  )
}
