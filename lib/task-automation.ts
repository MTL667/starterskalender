import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { eventBus } from '@/lib/events'
import { createCalendarEvent, isCalendarGraphConfigured } from '@/lib/graph-calendar'

/**
 * Vervang variabelen in een string met waarden
 */
function replaceVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value)
  }
  return result
}

/**
 * Topological sort van templates op basis van dependsOnTemplateIds.
 * Dependencies die niet in de lijst zitten worden genegeerd voor de sortering.
 */
function topologicalSort<T extends { id: string; dependsOnTemplateIds: string[] }>(
  templates: T[]
): T[] {
  const idSet = new Set(templates.map(t => t.id))
  const indegree = new Map<string, number>()
  const graph = new Map<string, string[]>()

  for (const t of templates) {
    indegree.set(t.id, 0)
    graph.set(t.id, [])
  }
  for (const t of templates) {
    for (const dep of t.dependsOnTemplateIds || []) {
      if (idSet.has(dep)) {
        graph.get(dep)!.push(t.id)
        indegree.set(t.id, (indegree.get(t.id) || 0) + 1)
      }
    }
  }

  const queue: string[] = []
  for (const [id, deg] of indegree.entries()) {
    if (deg === 0) queue.push(id)
  }

  const sortedIds: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    sortedIds.push(id)
    for (const next of graph.get(id) || []) {
      indegree.set(next, (indegree.get(next) || 0) - 1)
      if (indegree.get(next) === 0) queue.push(next)
    }
  }

  // Als er een cycle is: fallback naar originele volgorde voor overige nodes
  if (sortedIds.length !== templates.length) {
    const seen = new Set(sortedIds)
    for (const t of templates) {
      if (!seen.has(t.id)) sortedIds.push(t.id)
    }
  }

  const byId = new Map(templates.map(t => [t.id, t]))
  return sortedIds.map(id => byId.get(id)!).filter(Boolean)
}

/**
 * Unblock taken die op deze taak wachten.
 * Roep dit op zodra een taak COMPLETED wordt.
 */
export async function unblockDependentTasks(completedTaskId: string) {
  // Zoek alle taken die op deze taak wachten
  const candidates = await prisma.task.findMany({
    where: {
      status: 'BLOCKED',
      dependsOnTaskIds: { has: completedTaskId },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      entity: { select: { id: true, name: true } },
      starter: { select: { id: true, firstName: true, lastName: true, startDate: true } },
    },
  })

  if (candidates.length === 0) return []

  const unblocked: any[] = []

  for (const candidate of candidates) {
    // Check of ALLE dependencies nu COMPLETED zijn (AND-gate)
    if (candidate.dependsOnTaskIds.length === 0) continue
    const deps = await prisma.task.findMany({
      where: { id: { in: candidate.dependsOnTaskIds } },
      select: { id: true, status: true },
    })
    const allDone = deps.length === candidate.dependsOnTaskIds.length &&
      deps.every(d => d.status === 'COMPLETED')
    if (!allDone) continue

    // Unblock
    const updated = await prisma.task.update({
      where: { id: candidate.id },
      data: {
        status: 'PENDING',
        blockedReason: null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        entity: { select: { id: true, name: true } },
        starter: { select: { id: true, firstName: true, lastName: true, startDate: true } },
      },
    })
    unblocked.push(updated)

    // Stuur notificatie naar assignee
    if (updated.assignedToId) {
      const starterName = updated.starter
        ? `${updated.starter.firstName} ${updated.starter.lastName}`
        : ''
      await prisma.notification.create({
        data: {
          userId: updated.assignedToId,
          type: 'TASK_UNBLOCKED',
          title: 'Taak klaar om op te pakken',
          message: starterName
            ? `"${updated.title}" is niet langer geblokkeerd. Alle afhankelijke taken zijn voltooid voor ${starterName}.`
            : `"${updated.title}" is niet langer geblokkeerd.`,
          taskId: updated.id,
          starterId: updated.starterId,
          linkUrl: `/taken?taskId=${updated.id}`,
        },
      })

      if (updated.entityId) {
        eventBus.emit({ type: 'notification:new', entityId: updated.entityId, payload: { taskId: updated.id } })
      }

      // Mail afhankelijk van assignment-kanaal
      const assignment = await prisma.taskAssignment.findFirst({
        where: {
          OR: [
            { entityId: updated.entityId, taskType: updated.type },
            { entityId: null, taskType: updated.type },
          ],
        },
        orderBy: { entityId: 'desc' },
      })
      if (
        assignment &&
        (assignment.notifyChannel === 'EMAIL' || assignment.notifyChannel === 'BOTH') &&
        updated.assignedTo?.email
      ) {
        try {
          await sendTaskUnblockedEmail(updated)
        } catch (err) {
          console.error('Failed to send unblock email:', err)
        }
      }
    }

    console.log(`▶️  Unblocked task: ${updated.title}`)
  }

  return unblocked
}

/**
 * Maak automatisch taken aan bij het aanmaken van een nieuwe starter.
 *
 * @param starter Prisma starter object (met entity + relevante velden).
 * @param explicitType Override voor starter type (ONBOARDING/OFFBOARDING/MIGRATION).
 * @param options.skipExisting Als true, sla templates over waar al een Task
 *        bestaat voor `(starterId, templateId)`. Dependencies worden dan
 *        resolved naar de bestaande task, zodat nieuwe afhankelijke taken
 *        correct geblokkeerd/ready zijn.
 */
export async function createAutomaticTasks(
  starter: any,
  explicitType?: string,
  options: { skipExisting?: boolean } = {}
) {
  try {
    const starterType = explicitType || starter.type || 'ONBOARDING'
    const skipExisting = options.skipExisting === true
    console.log(`🔧 createAutomaticTasks called for "${starter.firstName} ${starter.lastName}" with type: ${starterType} (explicit: ${explicitType}, starter.type: ${starter.type}, skipExisting: ${skipExisting})`)

    // Auto-fix: update templates with null forStarterType based on known titles
    const TITLE_TO_TYPE: Record<string, string> = {
      'Mailadres toewijzen aan {{starterName}}': 'ONBOARDING',
      'Telefoonnummer toewijzen aan {{starterName}}': 'ONBOARDING',
      'Betrokken materialen voorzien voor {{starterName}}': 'ONBOARDING',
      'Accounts deactiveren voor {{starterName}}': 'OFFBOARDING',
      'Materialen innemen van {{starterName}}': 'OFFBOARDING',
      'Administratieve afhandeling vertrek {{starterName}}': 'OFFBOARDING',
      'Accounts aanpassen voor migratie {{starterName}}': 'MIGRATION',
      'Administratieve verwerking migratie {{starterName}}': 'MIGRATION',
    }

    const nullTemplates = await prisma.taskTemplate.findMany({
      where: { forStarterType: null, isActive: true },
    })

    if (nullTemplates.length > 0) {
      console.log(`⚠️ Found ${nullTemplates.length} templates with null forStarterType, fixing...`)
      for (const t of nullTemplates) {
        const correctType = TITLE_TO_TYPE[t.title]
        if (correctType) {
          await prisma.taskTemplate.update({
            where: { id: t.id },
            data: { forStarterType: correctType as any },
          })
          console.log(`✅ Fixed template "${t.title}" → ${correctType}`)
        }
      }
    }

    // Haal templates op die exact matchen met het starter type
    const templates = await prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        autoAssign: true,
        forStarterType: starterType,
      },
    })

    console.log(`📋 Found ${templates.length} matching templates for type ${starterType}:`, templates.map(t => t.title))

    if (templates.length === 0) {
      console.log('No active task templates found for type', starterType)
      return []
    }

    // Filter welke templates werkelijk toegepast worden (entiteit + functie)
    const applicableTemplates = templates.filter((template) => {
      if (template.forEntityIds.length > 0 && starter.entityId) {
        if (!template.forEntityIds.includes(starter.entityId)) return false
      }
      // Job role filter. Twee modi:
      //  - requireExplicitJobRole = false (legacy): lege lijst = alle functies
      //  - requireExplicitJobRole = true (opt-in): lege lijst = geen enkele functie,
      //    starter moet expliciet in lijst staan
      if ((template as any).requireExplicitJobRole) {
        if (!starter.roleTitle) return false
        if (!template.forJobRoleTitles.includes(starter.roleTitle)) return false
      } else if (template.forJobRoleTitles.length > 0 && starter.roleTitle) {
        if (!template.forJobRoleTitles.includes(starter.roleTitle)) return false
      }
      return true
    })

    const applicableTemplateIds = new Set(applicableTemplates.map(t => t.id))

    // Sorteer templates topologisch op basis van dependencies (geen cycles in
    // onze seed — als er toch een cycle is valt het terug op originele volgorde)
    const orderedTemplates = topologicalSort(applicableTemplates)

    // Map van templateId → Task ID (zowel nieuw aangemaakt als reeds bestaand)
    // — nodig om dependencies te resolven naar concrete Task IDs.
    const templateIdToTaskId = new Map<string, string>()

    // Preload bestaande tasks (alleen bij skipExisting): we mappen templateId → Task ID
    if (skipExisting) {
      const existing = await prisma.task.findMany({
        where: {
          starterId: starter.id,
          templateId: { in: applicableTemplates.map(t => t.id) },
        },
        select: { id: true, templateId: true },
      })
      for (const e of existing) {
        if (e.templateId) templateIdToTaskId.set(e.templateId, e.id)
      }
    }

    const createdTasks: any[] = []

    for (const template of orderedTemplates) {
      // Bij regenerate: skip templates waar al een Task voor deze starter bestaat
      if (skipExisting && templateIdToTaskId.has(template.id)) {
        console.log(`⏭️  Skip bestaande template: ${template.title}`)
        continue
      }

      // Dependencies binnen deze batch oplossen naar concrete Task IDs
      const dependsOnTaskIds: string[] = []
      let hasUnresolvedDependency = false
      for (const depTemplateId of (template.dependsOnTemplateIds || [])) {
        if (!applicableTemplateIds.has(depTemplateId)) {
          continue
        }
        const depTaskId = templateIdToTaskId.get(depTemplateId)
        if (depTaskId) {
          dependsOnTaskIds.push(depTaskId)
        } else {
          hasUnresolvedDependency = true
        }
      }

      // Bereken due date volgens scheduleType
      const startDate = starter.startDate ? new Date(starter.startDate) : null
      let dueDate: Date | null = null
      let scheduledFor: Date | null = null

      if (startDate) {
        if (template.scheduleType === 'ON_START_DATE') {
          scheduledFor = new Date(startDate)
          scheduledFor.setHours(9, 0, 0, 0)
          dueDate = new Date(startDate)
          dueDate.setHours(17, 0, 0, 0)
        } else if (template.scheduleType === 'AFTER_DEPENDENCIES') {
          // Eindstate — dueDate wordt gezet zodra dependencies klaar zijn.
          // Als fallback: startDate + daysUntilDue (meestal positief getal).
          dueDate = new Date(startDate)
          dueDate.setDate(dueDate.getDate() + (template.daysUntilDue || 7))
        } else {
          // OFFSET_FROM_START — bestaand gedrag
          dueDate = new Date(startDate)
          dueDate.setDate(dueDate.getDate() + template.daysUntilDue)
        }
      }

      // Bepaal initiële status. Als alle concrete dependencies al COMPLETED
      // zijn (bv. bij regenerate voor een bestaande starter), hoeft de taak
      // niet geblokkeerd te worden.
      let allDepsCompleted = false
      if (skipExisting && dependsOnTaskIds.length > 0 && !hasUnresolvedDependency) {
        const depStatuses = await prisma.task.findMany({
          where: { id: { in: dependsOnTaskIds } },
          select: { status: true },
        })
        allDepsCompleted = depStatuses.length === dependsOnTaskIds.length &&
          depStatuses.every(d => d.status === 'COMPLETED')
      }

      const hasBlockingDeps =
        (dependsOnTaskIds.length > 0 || hasUnresolvedDependency) && !allDepsCompleted
      const initialStatus = hasBlockingDeps ? 'BLOCKED' : 'PENDING'
      const blockedReason = hasBlockingDeps
        ? 'Wacht op afronding van afhankelijke taken'
        : null

      // Variabelen voor template
      const variables = {
        starterName: `${starter.firstName} ${starter.lastName}`,
        starterFirstName: starter.firstName,
        starterLastName: starter.lastName,
        entityName: starter.entity?.name || 'Onbekend',
        roleTitle: starter.roleTitle || 'Onbekend',
        startDate: starter.startDate
          ? new Date(starter.startDate).toLocaleDateString('nl-BE')
          : 'Nog niet bekend',
        desiredEmail: starter.desiredEmail || '',
        phoneNumber: starter.phoneNumber || '',
      }

      // Vervang variabelen in title en description
      const title = replaceVariables(template.title, variables)
      const description = template.description
        ? replaceVariables(template.description, variables)
        : null

      // Zoek verantwoordelijke voor dit taak type en entiteit
      let assignedToId: string | null = null

      // Probeer eerst entiteit-specifieke assignment
      if (starter.entityId) {
        const assignment = await prisma.taskAssignment.findUnique({
          where: {
            entityId_taskType: {
              entityId: starter.entityId,
              taskType: template.type,
            },
          },
        })
        if (assignment) {
          assignedToId = assignment.assignedToId
        }
      }

      // Fallback naar global assignment (entityId = null)
      if (!assignedToId) {
        const globalAssignment = await prisma.taskAssignment.findFirst({
          where: {
            entityId: null,
            taskType: template.type,
          },
        })
        if (globalAssignment) {
          assignedToId = globalAssignment.assignedToId
        }
      }

      // Maak taak aan
      const task = await prisma.task.create({
        data: {
          type: template.type,
          title,
          description,
          priority: template.priority,
          status: initialStatus as any,
          blockedReason,
          starterId: starter.id,
          entityId: starter.entityId,
          assignedToId,
          assignedAt: assignedToId ? new Date() : null,
          dueDate,
          scheduledFor,
          dependsOnTaskIds,
          templateId: template.id,
          createdById: starter.createdBy,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          entity: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      createdTasks.push(task)
      templateIdToTaskId.set(template.id, task.id)

      // O365 kalender event aanmaken indien template dit vereist
      if (
        (template as any).addToCalendar &&
        task.assignedTo?.email &&
        scheduledFor &&
        isCalendarGraphConfigured()
      ) {
        try {
          const eventStart = scheduledFor
          const eventEnd = new Date(eventStart.getTime() + 30 * 60 * 1000)
          const bodyHtml = [
            `<p><strong>${title}</strong></p>`,
            description ? `<p>${description.replace(/\n/g, '<br>')}</p>` : '',
            `<p>Starter: ${variables.starterName}<br>Entiteit: ${variables.entityName}</p>`,
            `<p>Link: ${process.env.NEXTAUTH_URL || ''}/taken?taskId=${task.id}</p>`,
          ].join('')
          const eventId = await createCalendarEvent({
            assigneeEmail: task.assignedTo.email,
            subject: title,
            body: bodyHtml,
            start: eventStart,
            end: eventEnd,
            timeZone: 'Europe/Brussels',
          })
          if (eventId) {
            await prisma.task.update({
              where: { id: task.id },
              data: { o365EventId: eventId },
            })
            console.log(`📅 Calendar event aangemaakt voor "${title}" (${eventId})`)
          }
        } catch (err) {
          console.error('Failed to create calendar event:', err)
        }
      }

      // Bij BLOCKED status: geen directe assignment-notificatie sturen
      // (komt later wanneer de taak PENDING wordt via unblockDependentTasks)
      if (initialStatus === 'BLOCKED') {
        console.log(`⏸️  Created BLOCKED task: ${title} (wacht op ${dependsOnTaskIds.length} taken)`)
        continue
      }

      // Maak notificatie aan voor verantwoordelijke
      if (assignedToId) {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            type: 'TASK_ASSIGNED',
            title: 'Nieuwe taak toegewezen',
            message: `Je hebt een nieuwe taak: "${title}" voor starter ${starter.firstName} ${starter.lastName}`,
            taskId: task.id,
            starterId: starter.id,
            linkUrl: `/taken?taskId=${task.id}`,
          },
        })

        if (starter.entityId) {
          eventBus.emit({ type: 'notification:new', entityId: starter.entityId, payload: { taskId: task.id } })
        }

        // Haal notification channel setting op
        const assignment = await prisma.taskAssignment.findFirst({
          where: {
            OR: [
              {
                entityId: starter.entityId,
                taskType: template.type,
              },
              {
                entityId: null,
                taskType: template.type,
              },
            ],
          },
          orderBy: {
            entityId: 'desc', // Entiteit-specifiek gaat voor global
          },
        })

        // Stuur email notificatie als dat ingesteld staat
        if (
          assignment &&
          (assignment.notifyChannel === 'EMAIL' || assignment.notifyChannel === 'BOTH')
        ) {
          try {
            await sendTaskAssignmentEmail(task, starter)
          } catch (emailError) {
            console.error('Failed to send task assignment email:', emailError)
            // Don't fail the task creation if email fails
          }
        }
      }

      console.log(`✅ Created task: ${title} (${task.type}) for starter ${starter.firstName} ${starter.lastName}`)
    }

    return createdTasks
  } catch (error) {
    console.error('Error creating automatic tasks:', error)
    throw error
  }
}

/**
 * Label mapping voor alle task types (hergebruikt in meerdere emails)
 */
export const TASK_TYPE_LABELS: Record<string, string> = {
  IT_SETUP: 'IT Setup',
  HR_ADMIN: 'HR Administratie',
  FACILITIES: 'Facilities',
  MANAGER_ACTION: 'Manager Actie',
  CUSTOM: 'Custom',
  MARKETING_PHOTO: 'Marketing — Foto',
  MARKETING_EDIT: 'Marketing — Foto-edit',
  MARKETING_UTM: 'Marketing — UTM',
  MARKETING_VCARD: 'Marketing — vCard',
  MARKETING_VISITEKAARTJE: 'Marketing — Visitekaartje',
  MARKETING_BADGE: 'Marketing — Badge',
  MARKETING_NFC: 'Marketing — NFC Badge',
  MARKETING_SIGNATURE: 'Marketing — Emailhandtekening',
}

/**
 * Verstuur email notificatie bij taak toewijzing
 */
async function sendTaskAssignmentEmail(task: any, starter: any) {
  if (!task.assignedTo) {
    return
  }

  const assigneeName = task.assignedTo.name || task.assignedTo.email
  const starterName = `${starter.firstName} ${starter.lastName}`
  const entityName = task.entity?.name || 'Onbekend'
  const startDate = starter.startDate
    ? new Date(starter.startDate).toLocaleDateString('nl-BE')
    : 'Nog niet bekend'
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('nl-BE')
    : 'Geen deadline'

  const taskTypeLabels = TASK_TYPE_LABELS

  const priorityLabels: Record<string, string> = {
    LOW: 'Laag',
    MEDIUM: 'Normaal',
    HIGH: 'Hoog',
    URGENT: 'Urgent',
  }

  const subject = `Nieuwe taak: ${task.title}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; margin-left: 10px; }
    .priority-${task.priority.toLowerCase()} { 
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      ${task.priority === 'URGENT' ? 'background: #fee; color: #c00;' : ''}
      ${task.priority === 'HIGH' ? 'background: #fff3cd; color: #856404;' : ''}
      ${task.priority === 'MEDIUM' ? 'background: #d1ecf1; color: #0c5460;' : ''}
      ${task.priority === 'LOW' ? 'background: #f0f0f0; color: #666;' : ''}
    }
    .button { 
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
    .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Nieuwe Taak Toegewezen</h1>
    </div>
    <div class="content">
      <p>Hallo ${assigneeName},</p>
      <p>Je hebt een nieuwe taak toegewezen gekregen in het Airport systeem.</p>
      
      <div class="task-card">
        <h2 style="margin-top: 0;">${task.title}</h2>
        ${task.description ? `<p style="color: #666;">${task.description}</p>` : ''}
        
        <div style="margin-top: 20px;">
          <div style="margin: 10px 0;">
            <span class="label">Type:</span>
            <span class="value">${taskTypeLabels[task.type] || task.type}</span>
          </div>
          <div style="margin: 10px 0;">
            <span class="label">Prioriteit:</span>
            <span class="priority-${task.priority.toLowerCase()}">${priorityLabels[task.priority]}</span>
          </div>
          <div style="margin: 10px 0;">
            <span class="label">Starter:</span>
            <span class="value">${starterName}</span>
          </div>
          <div style="margin: 10px 0;">
            <span class="label">Entiteit:</span>
            <span class="value">${entityName}</span>
          </div>
          <div style="margin: 10px 0;">
            <span class="label">Startdatum:</span>
            <span class="value">${startDate}</span>
          </div>
          <div style="margin: 10px 0;">
            <span class="label">Deadline:</span>
            <span class="value">${dueDate}</span>
          </div>
        </div>
      </div>

      <center>
        <a href="${process.env.NEXTAUTH_URL}/taken/${task.id}" class="button">
          Bekijk Taak
        </a>
      </center>

      <div class="footer">
        <p>Deze email is automatisch gegenereerd door Airport.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    to: task.assignedTo.email,
    subject,
    html,
  })
}

/**
 * Verstuur email notificatie bij hertoewijzing van een taak
 */
export async function sendTaskReassignmentEmail(task: any, reassignedByName: string) {
  if (!task.assignedTo?.email) {
    return
  }

  const assigneeName = task.assignedTo.name || task.assignedTo.email
  const starterName = task.starter
    ? `${task.starter.firstName} ${task.starter.lastName}`
    : '—'
  const entityName = task.entity?.name || '—'
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('nl-BE')
    : 'Geen deadline'

  const taskTypeLabels = TASK_TYPE_LABELS

  const priorityLabels: Record<string, string> = {
    LOW: 'Laag',
    MEDIUM: 'Normaal',
    HIGH: 'Hoog',
    URGENT: 'Urgent',
  }

  const subject = `Taak toegewezen: ${task.title}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; margin-left: 10px; }
    .priority-${task.priority?.toLowerCase() || 'medium'} {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      ${task.priority === 'URGENT' ? 'background: #fee; color: #c00;' : ''}
      ${task.priority === 'HIGH' ? 'background: #fff3cd; color: #856404;' : ''}
      ${task.priority === 'MEDIUM' ? 'background: #d1ecf1; color: #0c5460;' : ''}
      ${task.priority === 'LOW' ? 'background: #f0f0f0; color: #666;' : ''}
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
    .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔄 Taak Toegewezen</h1>
    </div>
    <div class="content">
      <p>Hallo ${assigneeName},</p>
      <p>Een taak is aan jou toegewezen door <strong>${reassignedByName}</strong>.</p>

      <div class="task-card">
        <h2 style="margin-top: 0;">${task.title}</h2>
        ${task.description ? `<p style="color: #666;">${task.description}</p>` : ''}

        <div style="margin-top: 20px;">
          <div style="margin: 10px 0;">
            <span class="label">Type:</span>
            <span class="value">${taskTypeLabels[task.type] || task.type}</span>
          </div>
          <div style="margin: 10px 0;">
            <span class="label">Prioriteit:</span>
            <span class="priority-${task.priority?.toLowerCase() || 'medium'}">${priorityLabels[task.priority] || task.priority}</span>
          </div>
          ${starterName !== '—' ? `
          <div style="margin: 10px 0;">
            <span class="label">Medewerker:</span>
            <span class="value">${starterName}</span>
          </div>` : ''}
          ${entityName !== '—' ? `
          <div style="margin: 10px 0;">
            <span class="label">Entiteit:</span>
            <span class="value">${entityName}</span>
          </div>` : ''}
          <div style="margin: 10px 0;">
            <span class="label">Deadline:</span>
            <span class="value">${dueDate}</span>
          </div>
        </div>
      </div>

      <center>
        <a href="${process.env.NEXTAUTH_URL}/taken?taskId=${task.id}" class="button">
          Bekijk Taak
        </a>
      </center>

      <div class="footer">
        <p>Deze email is automatisch gegenereerd door Airport.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    to: task.assignedTo.email,
    subject,
    html,
  })
}


/**
 * Stuur email naar assignee wanneer een taak is unblocked
 */
async function sendTaskUnblockedEmail(task: any) {
  if (!task.assignedTo?.email) return

  const assigneeName = task.assignedTo.name || task.assignedTo.email
  const starterName = task.starter
    ? `${task.starter.firstName} ${task.starter.lastName}`
    : '—'
  const entityName = task.entity?.name || '—'
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('nl-BE')
    : 'Geen deadline'

  const subject = `▶️ Taak klaar om op te pakken: ${task.title}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; margin-left: 10px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>▶️ Taak Klaar om Op te Pakken</h1>
    </div>
    <div class="content">
      <p>Hallo ${assigneeName},</p>
      <p>Alle afhankelijke taken zijn voltooid. Je kan nu aan de slag met deze taak:</p>

      <div class="task-card">
        <h2 style="margin-top: 0;">${task.title}</h2>
        ${task.description ? `<p style="color: #666; white-space: pre-wrap;">${task.description}</p>` : ''}
        <div style="margin-top: 20px;">
          ${starterName !== '—' ? `<div style="margin: 10px 0;"><span class="label">Starter:</span><span class="value">${starterName}</span></div>` : ''}
          ${entityName !== '—' ? `<div style="margin: 10px 0;"><span class="label">Entiteit:</span><span class="value">${entityName}</span></div>` : ''}
          <div style="margin: 10px 0;"><span class="label">Deadline:</span><span class="value">${dueDate}</span></div>
        </div>
      </div>

      <center>
        <a href="${process.env.NEXTAUTH_URL}/taken?taskId=${task.id}" class="button">
          Bekijk Taak
        </a>
      </center>

      <div class="footer">
        <p>Deze email is automatisch gegenereerd door Airport.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await sendEmail({
    to: task.assignedTo.email,
    subject,
    html,
  })
}
