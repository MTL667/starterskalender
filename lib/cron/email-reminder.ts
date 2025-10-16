#!/usr/bin/env node
/**
 * Cron job voor het versturen van e-mail reminders
 * Draait dagelijks en stuurt reminders voor starters die over 7 dagen beginnen
 * 
 * Gebruik:
 * - Vercel Cron: voeg toe aan vercel.json
 * - Node-cron: draai als achtergrondproces
 * - Handmatig: tsx lib/cron/email-reminder.ts
 */

import { prisma } from '../prisma'
import { sendReminderEmail } from '../email'
import { addDays, startOfDay, endOfDay } from 'date-fns'
import { getTodayInTimezone } from '../week-utils'

export async function runEmailReminderJob(): Promise<void> {
  console.log('[Email Reminder Job] Starting...')
  
  const today = getTodayInTimezone()
  const targetDate = addDays(today, 7)
  const targetStart = startOfDay(targetDate)
  const targetEnd = endOfDay(targetDate)
  
  console.log(`[Email Reminder Job] Looking for starters on ${targetDate.toISOString().split('T')[0]}`)
  
  // Haal alle starters op die over 7 dagen beginnen
  const starters = await prisma.starter.findMany({
    where: {
      startDate: {
        gte: targetStart,
        lte: targetEnd,
      },
    },
    include: {
      entity: true,
    },
  })
  
  console.log(`[Email Reminder Job] Found ${starters.length} starter(s)`)
  
  if (starters.length === 0) {
    console.log('[Email Reminder Job] No starters found, exiting')
    return
  }
  
  // Groepeer per entiteit
  const startersByEntity = new Map<string, typeof starters>()
  
  for (const starter of starters) {
    if (!starter.entity || !starter.entity.isActive) continue
    
    const entityId = starter.entity.id
    if (!startersByEntity.has(entityId)) {
      startersByEntity.set(entityId, [])
    }
    startersByEntity.get(entityId)!.push(starter)
  }
  
  console.log(`[Email Reminder Job] Grouped into ${startersByEntity.size} entit(y/ies)`)
  
  // Verstuur e-mails per entiteit
  for (const [entityId, entityStarters] of startersByEntity) {
    const entity = entityStarters[0].entity!
    
    if (!entity.notifyEmails || entity.notifyEmails.length === 0) {
      console.log(`[Email Reminder Job] No notify emails for entity ${entity.name}, skipping`)
      continue
    }
    
    try {
      await sendReminderEmail({
        to: entity.notifyEmails,
        starters: entityStarters.map(s => ({
          id: s.id,
          name: s.name,
          region: s.region,
          roleTitle: s.roleTitle,
          startDate: s.startDate,
          entityName: entity.name,
          entityColor: entity.colorHex,
        })),
        entityName: entity.name,
      })
      
      console.log(`[Email Reminder Job] Sent reminder for ${entity.name} to ${entity.notifyEmails.length} recipient(s)`)
    } catch (error) {
      console.error(`[Email Reminder Job] Failed to send reminder for ${entity.name}:`, error)
      // Continue met volgende entiteit
    }
  }
  
  console.log('[Email Reminder Job] Completed')
}

// Als direct uitgevoerd (niet geïmporteerd)
if (require.main === module) {
  runEmailReminderJob()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[Email Reminder Job] Fatal error:', error)
      process.exit(1)
    })
}

