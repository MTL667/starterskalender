/**
 * Shared helpers for cron email rendering.
 * Used by all 4 cron send routes + cron-preview.
 */

type StarterWithEntity = {
  id: string
  name: string
  type: string
  language: string
  roleTitle: string | null
  startDate: Date | null
  fromEntity?: { name: string } | null
  entity: { name: string } | null
}

const BORDER_COLORS: Record<string, string> = {
  ONBOARDING: '#3b82f6',
  OFFBOARDING: '#f97316',
  MIGRATION: '#8b5cf6',
}

const TYPE_ICONS: Record<string, string> = {
  ONBOARDING: '🟢',
  OFFBOARDING: '🔴',
  MIGRATION: '🔄',
}

const DATE_LABELS: Record<string, string> = {
  ONBOARDING: 'Start',
  OFFBOARDING: 'Vertrek',
  MIGRATION: 'Mutatie',
}

export function renderStarterItem(s: StarterWithEntity): string {
  const flag = s.language === 'FR' ? '🇫🇷' : '🇳🇱'
  const borderColor = BORDER_COLORS[s.type] || BORDER_COLORS.ONBOARDING
  const icon = TYPE_ICONS[s.type] || ''
  const dateLabel = DATE_LABELS[s.type] || 'Start'
  const roleHtml = s.roleTitle
    ? `<span style="color: #6b7280;">${s.roleTitle}</span><br/>`
    : ''
  const dateStr = s.startDate
    ? new Date(s.startDate).toLocaleDateString('nl-BE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Datum onbekend'

  let migrationHtml = ''
  if (s.type === 'MIGRATION' && s.fromEntity) {
    migrationHtml = `<span style="color: #6b7280; font-size: 13px;">Van: ${s.fromEntity.name} → ${s.entity?.name || '?'}</span><br/>`
  }

  return (
    `<li style="padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid ${borderColor}; border-radius: 4px;">` +
    `${icon} <strong>${s.name}</strong> ${flag}<br/>` +
    roleHtml +
    migrationHtml +
    `<span style="color: #6b7280; font-size: 14px;">${dateLabel}: ${dateStr}</span>` +
    `</li>`
  )
}

export function renderEntitySection(
  entityName: string,
  starters: StarterWithEntity[]
): string {
  const items = starters.map(renderStarterItem).join('')
  return (
    `<div style="margin-bottom: 20px;">` +
    `<h3 style="color: #1f2937; margin-bottom: 10px;">${entityName} (${starters.length})</h3>` +
    `<ul style="list-style-type: none; padding: 0;">${items}</ul>` +
    `</div>`
  )
}

export function groupByEntity(
  starters: StarterWithEntity[]
): Record<string, StarterWithEntity[]> {
  return starters.reduce(
    (acc, s) => {
      const name = s.entity?.name || 'Onbekend'
      if (!acc[name]) acc[name] = []
      acc[name].push(s)
      return acc
    },
    {} as Record<string, StarterWithEntity[]>
  )
}

export function renderAllEntities(starters: StarterWithEntity[]): string {
  const grouped = groupByEntity(starters)
  return Object.entries(grouped)
    .map(([name, items]) => renderEntitySection(name, items))
    .join('')
}

export interface TypeCounts {
  onboarding: number
  offboarding: number
  migration: number
  total: number
}

export function countByType(starters: StarterWithEntity[]): TypeCounts {
  const counts: TypeCounts = { onboarding: 0, offboarding: 0, migration: 0, total: starters.length }
  for (const s of starters) {
    if (s.type === 'OFFBOARDING') counts.offboarding++
    else if (s.type === 'MIGRATION') counts.migration++
    else counts.onboarding++
  }
  return counts
}

export function buildSubjectParts(counts: TypeCounts): string {
  const parts: string[] = []
  if (counts.onboarding > 0) parts.push(`${counts.onboarding} starter${counts.onboarding !== 1 ? 's' : ''}`)
  if (counts.offboarding > 0) parts.push(`${counts.offboarding} vertrekker${counts.offboarding !== 1 ? 's' : ''}`)
  if (counts.migration > 0) parts.push(`${counts.migration} mutatie${counts.migration !== 1 ? 's' : ''}`)
  return parts.join(', ')
}

export function renderSummaryBlocks(counts: TypeCounts): string {
  const blocks: string[] = []

  if (counts.onboarding > 0) {
    blocks.push(
      `<div style="text-align: center; flex: 1; padding: 15px; background: #eff6ff; border-radius: 8px;">` +
      `<div style="font-size: 28px; font-weight: bold; color: #1e40af;">${counts.onboarding}</div>` +
      `<div style="color: #1e40af; font-size: 13px;">🟢 Starter${counts.onboarding !== 1 ? 's' : ''}</div>` +
      `</div>`
    )
  }
  if (counts.offboarding > 0) {
    blocks.push(
      `<div style="text-align: center; flex: 1; padding: 15px; background: #fff7ed; border-radius: 8px;">` +
      `<div style="font-size: 28px; font-weight: bold; color: #c2410c;">${counts.offboarding}</div>` +
      `<div style="color: #c2410c; font-size: 13px;">🔴 Vertrekker${counts.offboarding !== 1 ? 's' : ''}</div>` +
      `</div>`
    )
  }
  if (counts.migration > 0) {
    blocks.push(
      `<div style="text-align: center; flex: 1; padding: 15px; background: #f5f3ff; border-radius: 8px;">` +
      `<div style="font-size: 28px; font-weight: bold; color: #6d28d9;">${counts.migration}</div>` +
      `<div style="color: #6d28d9; font-size: 13px;">🔄 Mutatie${counts.migration !== 1 ? 's' : ''}</div>` +
      `</div>`
    )
  }

  if (blocks.length === 0) return ''
  return `<div style="display: flex; gap: 10px; margin: 20px 0;">${blocks.join('')}</div>`
}
