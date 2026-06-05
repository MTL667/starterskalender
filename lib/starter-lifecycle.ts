import { prisma } from '@/lib/prisma'

/**
 * Creates IT cleanup tasks when a provisioned starter is cancelled or changes entity.
 */
export async function handleStarterCancellation(starterId: string, cancelledBy?: string): Promise<void> {
  const successfulJob = await prisma.provisioningJob.findFirst({
    where: { starterId, state: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
    select: { graphUserId: true, assignedLicenseType: true, entityId: true },
  })

  if (!successfulJob) return

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { firstName: true, lastName: true, desiredEmail: true, entityId: true },
  })

  if (!starter) return

  await prisma.task.create({
    data: {
      type: 'IT_SETUP',
      entityId: successfulJob.entityId,
      starterId,
      title: `Deactivate M365 account: ${starter.firstName} ${starter.lastName}`,
      description: [
        `Starter: ${starter.firstName} ${starter.lastName}`,
        `Email: ${starter.desiredEmail || 'N/A'}`,
        `License: ${successfulJob.assignedLicenseType || 'Unknown'}`,
        '',
        'Actions required:',
        '- Deactivate the M365 account',
        '- Free the assigned license',
      ].join('\n'),
      status: 'PENDING',
      priority: 'HIGH',
    },
  })
}

export async function handleEntityMigration(
  starterId: string,
  fromEntityId: string,
  toEntityId: string,
  migratedBy?: string
): Promise<void> {
  const successfulJob = await prisma.provisioningJob.findFirst({
    where: { starterId, state: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
    select: { graphUserId: true, assignedLicenseType: true },
  })

  if (!successfulJob) return

  const starter = await prisma.starter.findUnique({
    where: { id: starterId },
    select: { firstName: true, lastName: true, desiredEmail: true },
  })

  if (!starter) return

  const [fromEntity, toEntity] = await Promise.all([
    prisma.entity.findUnique({ where: { id: fromEntityId }, select: { name: true } }),
    prisma.entity.findUnique({ where: { id: toEntityId }, select: { name: true } }),
  ])

  await prisma.task.create({
    data: {
      type: 'IT_SETUP',
      entityId: fromEntityId,
      starterId,
      title: `Entity migration: ${starter.firstName} ${starter.lastName}`,
      description: [
        `Starter: ${starter.firstName} ${starter.lastName}`,
        `Email: ${starter.desiredEmail || 'N/A'}`,
        `From: ${fromEntity?.name || fromEntityId}`,
        `To: ${toEntity?.name || toEntityId}`,
        '',
        'Actions required:',
        '- Review M365 account in source tenant',
        '- Reassign or deactivate account as appropriate',
        '- Free license in source tenant if applicable',
      ].join('\n'),
      status: 'PENDING',
      priority: 'HIGH',
    },
  })
}
