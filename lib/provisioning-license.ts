import { graphApiService } from '@/lib/graph-api-service'

export function skuAvailableUnits(sku: {
  prepaidUnits?: { enabled?: number | null } | null
  consumedUnits?: number | null
}): number {
  const enabled = Number(sku.prepaidUnits?.enabled ?? 0)
  const consumed = Number(sku.consumedUnits ?? 0)
  if (!Number.isFinite(enabled) || !Number.isFinite(consumed)) return 0
  return Math.max(0, enabled - consumed)
}

/** Validate client-supplied SKU against live Graph inventory for the target tenant. */
export async function resolveValidatedSku(
  entityId: string,
  skuId: string
): Promise<{ skuId: string; skuDisplayName: string }> {
  const skus = await graphApiService.getSubscribedSkus(entityId)
  const target = skus.find(s => s.skuId === skuId)
  if (!target) {
    throw new Error('Selected license is not available in the target tenant')
  }
  if (skuAvailableUnits(target) <= 0) {
    throw new Error('Selected license has no available units')
  }
  return { skuId: target.skuId, skuDisplayName: target.skuPartNumber }
}
