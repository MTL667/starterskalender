import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

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
 * Maak automatisch taken aan bij het aanmaken van een nieuwe starter
 */
export async function createAutomaticTasks(starter: any) {
  try {
    // Haal alle actieve task templates op
    const templates = await prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        autoAssign: true,
      },
    })

    if (templates.length === 0) {
      console.log('No active task templates found')
      return []
    }

    const createdTasks: any[] = []

    for (const template of templates) {
      // Check of template van toepassing is op deze starter
      let shouldApply = true

      // Filter op entiteit
      if (template.forEntityIds.length > 0 && starter.entityId) {
        shouldApply = template.forEntityIds.includes(starter.entityId)
      }

      // Filter op functie
      if (shouldApply && template.forJobRoleTitles.length > 0 && starter.roleTitle) {
        shouldApply = template.forJobRoleTitles.includes(starter.roleTitle)
      }

      if (!shouldApply) {
        continue
      }

      // Bereken due date
      const dueDate = new Date(starter.startDate)
      dueDate.setDate(dueDate.getDate() + template.daysUntilDue)

      // Variabelen voor template
      const variables = {
        starterName: starter.name,
        entityName: starter.entity?.name || 'Onbekend',
        roleTitle: starter.roleTitle || 'Onbekend',
        startDate: new Date(starter.startDate).toLocaleDateString('nl-BE'),
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
        const globalAssignment = await prisma.taskAssignment.findUnique({
          where: {
            entityId_taskType: {
              entityId: null as any,
              taskType: template.type,
            },
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
          starterId: starter.id,
          entityId: starter.entityId,
          assignedToId,
          assignedAt: assignedToId ? new Date() : null,
          dueDate,
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

      // Maak notificatie aan voor verantwoordelijke
      if (assignedToId) {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            type: 'TASK_ASSIGNED',
            title: 'Nieuwe taak toegewezen',
            message: `Je hebt een nieuwe taak: "${title}" voor starter ${starter.name}`,
            taskId: task.id,
            starterId: starter.id,
            linkUrl: `/taken/${task.id}`,
          },
        })

        // Haal notification channel setting op
        const assignment = await prisma.taskAssignment.findFirst({
          where: {
            OR: [
              {
                entityId: starter.entityId,
                taskType: template.type,
              },
              {
                entityId: null as any,
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

      console.log(`✅ Created task: ${title} (${task.type}) for starter ${starter.name}`)
    }

    return createdTasks
  } catch (error) {
    console.error('Error creating automatic tasks:', error)
    throw error
  }
}

/**
 * Verstuur email notificatie bij taak toewijzing
 */
async function sendTaskAssignmentEmail(task: any, starter: any) {
  if (!task.assignedTo) {
    return
  }

  const assigneeName = task.assignedTo.name || task.assignedTo.email
  const starterName = starter.name
  const entityName = task.entity?.name || 'Onbekend'
  const startDate = new Date(starter.startDate).toLocaleDateString('nl-BE')
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('nl-BE')
    : 'Geen deadline'

  const taskTypeLabels: Record<string, string> = {
    IT_SETUP: 'IT Setup',
    HR_ADMIN: 'HR Administratie',
    FACILITIES: 'Facilities',
    MANAGER_ACTION: 'Manager Actie',
    CUSTOM: 'Custom',
  }

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
      <p>Je hebt een nieuwe taak toegewezen gekregen in het Starterskalender systeem.</p>
      
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
        <p>Deze email is automatisch gegenereerd door Starterskalender.</p>
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

