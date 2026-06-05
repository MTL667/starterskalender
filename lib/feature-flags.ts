import { prisma } from '@/lib/prisma'

export type ModuleKey = 'recruitment' | 'entra' | 'materials'

export const MODULE_REGISTRY: Record<ModuleKey, { label: string; description: string }> = {
  recruitment: { label: 'Recruitment', description: 'Werving & selectie module' },
  entra: { label: 'Entra Mail Provisioning', description: 'M365 mail provisioning' },
  materials: { label: 'Materialen', description: 'Materiaal tracking' },
}

function settingsKey(moduleKey: ModuleKey): string {
  return `module.${moduleKey}.enabled`
}

export async function isModuleEnabled(moduleKey: ModuleKey): Promise<boolean> {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: settingsKey(moduleKey) },
    select: { value: true },
  })
  // Not present in DB = enabled (opt-out pattern)
  if (!setting || setting.value === null) return true
  return setting.value === 'true'
}

export async function getModuleFlags(): Promise<Record<ModuleKey, boolean>> {
  const keys = Object.keys(MODULE_REGISTRY) as ModuleKey[]
  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: keys.map(settingsKey) } },
  })

  const result = {} as Record<ModuleKey, boolean>
  for (const key of keys) {
    const setting = settings.find(s => s.key === settingsKey(key))
    result[key] = !setting || setting.value === null || setting.value === 'true'
  }
  return result
}

export async function setModuleEnabled(moduleKey: ModuleKey, enabled: boolean): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { key: settingsKey(moduleKey) },
    update: { value: String(enabled) },
    create: { key: settingsKey(moduleKey), value: String(enabled) },
  })
}
