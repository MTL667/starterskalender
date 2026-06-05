import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { prisma } from '@/lib/prisma'
import { graphApiService, GraphAuthError, GraphTransientError, GraphRateLimitError } from '@/lib/graph-api-service'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const connections = await prisma.entraAppConnection.findMany({
    where: { consentStatus: 'healthy' },
    select: { entityId: true },
  })

  const results: { entityId: string; status: string; skusUpdated?: number }[] = []

  for (const { entityId } of connections) {
    try {
      const skus = await graphApiService.getSubscribedSkus(entityId)

      for (const sku of skus) {
        const available = sku.prepaidUnits.enabled - sku.consumedUnits
        await prisma.licenseCache.upsert({
          where: { entityId_skuId: { entityId, skuId: sku.skuId } },
          update: {
            skuPartNumber: sku.skuPartNumber,
            displayName: sku.skuPartNumber,
            totalUnits: sku.prepaidUnits.enabled,
            consumedUnits: sku.consumedUnits,
            availableUnits: available,
            lastSyncedAt: new Date(),
            syncError: null,
          },
          create: {
            entityId,
            skuId: sku.skuId,
            skuPartNumber: sku.skuPartNumber,
            displayName: sku.skuPartNumber,
            totalUnits: sku.prepaidUnits.enabled,
            consumedUnits: sku.consumedUnits,
            availableUnits: available,
          },
        })
      }

      await prisma.graphApiStatus.upsert({
        where: { entityId },
        update: { isReachable: true, lastCheckAt: new Date(), lastError: null },
        create: { entityId, isReachable: true },
      })

      results.push({ entityId, status: 'ok', skusUpdated: skus.length })
    } catch (err: any) {
      const isUnreachable = err instanceof GraphTransientError || err instanceof GraphRateLimitError

      await prisma.graphApiStatus.upsert({
        where: { entityId },
        update: { isReachable: !isUnreachable, lastCheckAt: new Date(), lastError: err.message },
        create: { entityId, isReachable: !isUnreachable, lastError: err.message },
      })

      results.push({ entityId, status: 'error' })
    }
  }

  // Demand forecasting check
  await checkLicenseDemand()

  return NextResponse.json({ synced: results.length, results })
}

async function checkLicenseDemand() {
  const entities = await prisma.entity.findMany({
    where: { entraAppConnection: { consentStatus: 'healthy' } },
    select: { id: true, name: true },
  })

  for (const entity of entities) {
    const pendingStarters = await prisma.starter.findMany({
      where: {
        entityId: entity.id,
        isCancelled: false,
        provisioningJobs: { none: { state: 'SUCCESS' } },
        roleTitle: { not: null },
      },
      select: { id: true, roleTitle: true, firstName: true, lastName: true },
    })

    if (pendingStarters.length === 0) continue

    const cachedLicenses = await prisma.licenseCache.findMany({
      where: { entityId: entity.id },
    })

    const demandByType: Record<string, number> = {}
    for (const starter of pendingStarters) {
      if (!starter.roleTitle) continue
      const jobRole = await prisma.jobRole.findFirst({
        where: { entityId: entity.id, title: starter.roleTitle },
        include: { licenseConfig: true },
      })
      if (jobRole?.licenseConfig) {
        const type = jobRole.licenseConfig.requiredLicenseType
        demandByType[type] = (demandByType[type] || 0) + 1
      }
    }

    for (const [licenseType, demand] of Object.entries(demandByType)) {
      const cache = cachedLicenses.find(c =>
        c.skuPartNumber.toUpperCase().includes(licenseType === 'BUSINESS_STANDARD' ? 'STANDARD' : 'BASIC')
      )
      const available = cache?.availableUnits ?? 0

      if (demand > available) {
        const existingTask = await prisma.task.findFirst({
          where: {
            entityId: entity.id,
            title: { contains: `License shortage: ${licenseType}` },
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        })

        if (!existingTask) {
          const affectedStarters = pendingStarters
            .map(s => `${s.firstName} ${s.lastName}`)
            .slice(0, 10)

          await prisma.task.create({
            data: {
              type: 'IT_SETUP',
              entityId: entity.id,
              title: `License shortage: ${licenseType}`,
              description: `Available: ${available}, Required: ${demand}. Affected starters: ${affectedStarters.join(', ')}`,
              status: 'PENDING',
              priority: 'HIGH',
            },
          })
        }
      }
    }
  }
}
