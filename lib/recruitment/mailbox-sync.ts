import { prisma } from '@/lib/prisma'
import type { EmailDirection } from '@prisma/client'

interface GraphEmailMessage {
  id: string
  subject: string
  bodyPreview: string
  sentDateTime: string
  from: { emailAddress: { address: string } }
  toRecipients: Array<{ emailAddress: { address: string } }>
}

interface SyncResult {
  synced: number
  skipped: number
}

export async function syncMailboxForUser(
  userId: string,
  accessToken: string,
  entityIds?: string[]
): Promise<SyncResult> {
  const candidateEmails = await prisma.candidate.findMany({
    where: {
      deletedAt: null,
      ...(entityIds ? { vacancy: { entityId: { in: entityIds } } } : {}),
    },
    select: {
      id: true,
      email: true,
      vacancyId: true,
      vacancy: { select: { status: true, createdAt: true } },
    },
  })

  const emailToCandidateMap = new Map<string, { candidateId: string; vacancyId: string }>()
  for (const c of candidateEmails) {
    const existing = emailToCandidateMap.get(c.email.toLowerCase())
    if (!existing || c.vacancy.createdAt > (candidateEmails.find(x => x.id === existing.candidateId)?.vacancy.createdAt ?? new Date(0))) {
      emailToCandidateMap.set(c.email.toLowerCase(), { candidateId: c.id, vacancyId: c.vacancyId })
    }
  }

  if (emailToCandidateMap.size === 0) return { synced: 0, skipped: 0 }

  const messages = await fetchRecentEmails(accessToken)
  let synced = 0
  let skipped = 0

  for (const msg of messages) {
    const fromAddr = msg.from.emailAddress.address.toLowerCase()
    const toAddrs = msg.toRecipients.map(r => r.emailAddress.address.toLowerCase())
    const allAddresses = [fromAddr, ...toAddrs]

    let matchedCandidate: { candidateId: string; vacancyId: string } | undefined
    let direction: EmailDirection = 'RECEIVED'

    for (const addr of allAddresses) {
      const match = emailToCandidateMap.get(addr)
      if (match) {
        matchedCandidate = match
        direction = addr === fromAddr ? 'RECEIVED' : 'SENT'
        break
      }
    }

    if (!matchedCandidate) { skipped++; continue }

    try {
      await prisma.linkedEmail.create({
        data: {
          candidateId: matchedCandidate.candidateId,
          userId,
          vacancyId: matchedCandidate.vacancyId,
          graphMessageId: msg.id,
          subject: msg.subject || '(geen onderwerp)',
          preview: (msg.bodyPreview || '').slice(0, 500),
          direction,
          sentAt: new Date(msg.sentDateTime),
        },
      })
      synced++
    } catch (err: any) {
      if (err?.code === 'P2002') { skipped++ }
      else throw err
    }
  }

  return { synced, skipped }
}

async function fetchRecentEmails(accessToken: string): Promise<GraphEmailMessage[]> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=sentDateTime desc&$select=id,subject,bodyPreview,sentDateTime,from,toRecipients',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status}`)
  }

  const data = await response.json()
  return data.value ?? []
}
