/**
 * O365 calendar integratie voor taken met `addToCalendar = true`.
 *
 * Gebruikt dezelfde credentials als `lib/graph-teams.ts` (application-level
 * client credentials flow). Vereist de applicatie-permissie
 * `Calendars.ReadWrite` op MS Graph.
 *
 * Faalt zachtjes: als niet geconfigureerd of permissies ontbreken geven we
 * `null` terug en loggen we, zodat de taak-creatie niet stuk gaat.
 */
import { ConfidentialClientApplication } from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'

const authority = `https://login.microsoftonline.com/${process.env.AZURE_DOCS_TENANT_ID}`

let cca: ConfidentialClientApplication | null = null

function getClientApp(): ConfidentialClientApplication {
  if (!cca) {
    cca = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_DOCS_CLIENT_ID!,
        clientSecret: process.env.AZURE_DOCS_CLIENT_SECRET!,
        authority,
      },
    })
  }
  return cca
}

async function getToken(): Promise<string> {
  const app = getClientApp()
  const result = await app.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  })
  if (!result?.accessToken) {
    throw new Error('Geen MS Graph token verkregen voor calendar')
  }
  return result.accessToken
}

async function graphClient(): Promise<Client> {
  const token = await getToken()
  return Client.init({
    authProvider: (done) => done(null, token),
  })
}

export function isCalendarGraphConfigured(): boolean {
  return !!(
    process.env.AZURE_DOCS_TENANT_ID &&
    process.env.AZURE_DOCS_CLIENT_ID &&
    process.env.AZURE_DOCS_CLIENT_SECRET
  )
}

export interface CalendarEventInput {
  assigneeEmail: string
  subject: string
  body?: string
  /** Start in ISO-8601 of Date. */
  start: Date | string
  /** Eind in ISO-8601. Default: 30 minuten na start. */
  end?: Date | string
  location?: string
  timeZone?: string
}

/**
 * Maak een agenda-event aan in de mailbox van `assigneeEmail`.
 * Geeft event-ID terug bij succes, of `null` als niet geconfigureerd of bij
 * Graph-fouten (de fout wordt dan alleen gelogd, zodat de caller door kan).
 */
export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<string | null> {
  if (!isCalendarGraphConfigured()) {
    console.log('[calendar] Graph niet geconfigureerd — event overgeslagen')
    return null
  }
  if (!input.assigneeEmail) {
    console.log('[calendar] Geen assignee email — event overgeslagen')
    return null
  }

  const startDate = input.start instanceof Date ? input.start : new Date(input.start)
  const endDate = input.end
    ? input.end instanceof Date ? input.end : new Date(input.end)
    : new Date(startDate.getTime() + 30 * 60 * 1000)
  const timeZone = input.timeZone || 'Europe/Brussels'

  const payload: any = {
    subject: input.subject,
    body: {
      contentType: 'HTML',
      content: input.body || '',
    },
    start: {
      dateTime: startDate.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone,
    },
    ...(input.location
      ? { location: { displayName: input.location } }
      : {}),
  }

  try {
    const client = await graphClient()
    // Application permission → /users/{email}/events
    const created = await client
      .api(`/users/${encodeURIComponent(input.assigneeEmail)}/events`)
      .post(payload)
    return created?.id || null
  } catch (err: any) {
    console.error('[calendar] Event aanmaken mislukt:', err?.message || err)
    return null
  }
}

export async function deleteCalendarEvent(
  assigneeEmail: string,
  eventId: string
): Promise<boolean> {
  if (!isCalendarGraphConfigured() || !assigneeEmail || !eventId) return false
  try {
    const client = await graphClient()
    await client
      .api(`/users/${encodeURIComponent(assigneeEmail)}/events/${eventId}`)
      .delete()
    return true
  } catch (err: any) {
    console.error('[calendar] Event verwijderen mislukt:', err?.message || err)
    return false
  }
}
