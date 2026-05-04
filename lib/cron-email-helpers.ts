/**
 * Shared helpers for cron email rendering.
 * Used by all 4 cron send routes + cron-preview.
 */

type StarterWithEntity = {
  id: string
  firstName: string
  lastName: string
  type: string
  language: string
  roleTitle: string | null
  startDate: Date | null
  fromEntity?: { name: string } | null
  entity: { name: string } | null
}

export type EmailLocale = 'nl' | 'fr'

const t: Record<string, Record<EmailLocale, string>> = {
  dateUnknown:    { nl: 'Datum onbekend',       fr: 'Date inconnue' },
  unknown:        { nl: 'Onbekend',             fr: 'Inconnu' },
  from:           { nl: 'Van',                  fr: 'De' },
  startLabel:     { nl: 'Start',                fr: 'Début' },
  departureLabel: { nl: 'Vertrek',              fr: 'Départ' },
  mutationLabel:  { nl: 'Mutatie',              fr: 'Mutation' },
  starter:        { nl: 'Starter',              fr: 'Starter' },
  starters:       { nl: 'Starters',             fr: 'Starters' },
  leaver:         { nl: 'Vertrekker',           fr: 'Partant' },
  leavers:        { nl: 'Vertrekkers',          fr: 'Partants' },
  mutation:       { nl: 'Mutatie',              fr: 'Mutation' },
  mutations:      { nl: 'Mutaties',             fr: 'Mutations' },
  hello:          { nl: 'Hallo',                fr: 'Bonjour' },
  nextWeekReminder: { nl: 'Dit is een herinnering voor volgende week:', fr: 'Ceci est un rappel pour la semaine prochaine\u00a0:' },
  ensurePrep:     { nl: 'Zorg ervoor dat alle voorbereidingen getroffen zijn!', fr: 'Assurez-vous que tous les préparatifs sont en ordre\u00a0!' },
  emailPrefNote:  { nl: 'Je ontvangt deze email omdat je geabonneerd bent op wekelijkse reminders.\nWijzig je voorkeuren in je profielinstellingen.', fr: 'Vous recevez cet email car vous êtes abonné(e) aux rappels hebdomadaires.\nModifiez vos préférences dans les paramètres de votre profil.' },
  nextWeek:       { nl: 'volgende week',        fr: 'la semaine prochaine' },
  monthlyOverview: { nl: 'Maandoverzicht',      fr: 'Aperçu mensuel' },
  monthlyNote:    { nl: 'Maandelijks overzicht voor', fr: 'Aperçu mensuel pour' },
  monthlyPrefNote: { nl: 'Wijzig je voorkeuren in je profielinstellingen.', fr: 'Modifiez vos préférences dans les paramètres de votre profil.' },
  quarterlyOverview: { nl: 'Kwartaaloverzicht', fr: 'Aperçu trimestriel' },
  quarterlyPrefNote: { nl: 'Kwartaaloverzicht voor', fr: 'Aperçu trimestriel pour' },
  yearlyOverview: { nl: 'Jaaroverzicht',        fr: 'Aperçu annuel' },
  yearlyLookback: { nl: 'Een terugblik op',     fr: 'Un regard rétrospectif sur' },
  yearlyOverviewOf: { nl: 'Overzicht',          fr: 'Aperçu' },
  yearlyPrefNote: { nl: 'Jaaroverzicht voor',   fr: 'Aperçu annuel pour' },
  perMonth:       { nl: 'Per Maand',            fr: 'Par mois' },
}

export function tt(key: string, locale: EmailLocale = 'nl'): string {
  return t[key]?.[locale] ?? t[key]?.nl ?? key
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

function getDateLabel(type: string, locale: EmailLocale): string {
  if (type === 'OFFBOARDING') return tt('departureLabel', locale)
  if (type === 'MIGRATION') return tt('mutationLabel', locale)
  return tt('startLabel', locale)
}

export function getDateLocale(locale: EmailLocale): string {
  return locale === 'fr' ? 'fr-BE' : 'nl-BE'
}

export function renderStarterItem(s: StarterWithEntity, locale: EmailLocale = 'nl'): string {
  const flag = s.language === 'FR' ? '🇫🇷' : '🇳🇱'
  const borderColor = BORDER_COLORS[s.type] || BORDER_COLORS.ONBOARDING
  const icon = TYPE_ICONS[s.type] || ''
  const dateLabel = getDateLabel(s.type, locale)
  const roleHtml = s.roleTitle
    ? `<span style="color: #6b7280;">${s.roleTitle}</span><br/>`
    : ''
  const dateStr = s.startDate
    ? new Date(s.startDate).toLocaleDateString(getDateLocale(locale), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : tt('dateUnknown', locale)

  let migrationHtml = ''
  if (s.type === 'MIGRATION' && s.fromEntity) {
    migrationHtml = `<span style="color: #6b7280; font-size: 13px;">${tt('from', locale)}: ${s.fromEntity.name} → ${s.entity?.name || '?'}</span><br/>`
  }

  return (
    `<li style="padding: 10px; margin: 5px 0; background: #f9fafb; border-left: 3px solid ${borderColor}; border-radius: 4px;">` +
    `${icon} <strong>${s.firstName} ${s.lastName}</strong> ${flag}<br/>` +
    roleHtml +
    migrationHtml +
    `<span style="color: #6b7280; font-size: 14px;">${dateLabel}: ${dateStr}</span>` +
    `</li>`
  )
}

export function renderEntitySection(
  entityName: string,
  starters: StarterWithEntity[],
  locale: EmailLocale = 'nl',
): string {
  const items = starters.map(s => renderStarterItem(s, locale)).join('')
  return (
    `<div style="margin-bottom: 20px;">` +
    `<h3 style="color: #1f2937; margin-bottom: 10px;">${entityName} (${starters.length})</h3>` +
    `<ul style="list-style-type: none; padding: 0;">${items}</ul>` +
    `</div>`
  )
}

export function groupByEntity(
  starters: StarterWithEntity[],
  locale: EmailLocale = 'nl',
): Record<string, StarterWithEntity[]> {
  return starters.reduce(
    (acc, s) => {
      const name = s.entity?.name || tt('unknown', locale)
      if (!acc[name]) acc[name] = []
      acc[name].push(s)
      return acc
    },
    {} as Record<string, StarterWithEntity[]>
  )
}

export function renderAllEntities(starters: StarterWithEntity[], locale: EmailLocale = 'nl'): string {
  const grouped = groupByEntity(starters, locale)
  return Object.entries(grouped)
    .map(([name, items]) => renderEntitySection(name, items, locale))
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

export function buildSubjectParts(counts: TypeCounts, locale: EmailLocale = 'nl'): string {
  const parts: string[] = []
  if (counts.onboarding > 0) parts.push(`${counts.onboarding} ${counts.onboarding !== 1 ? tt('starters', locale).toLowerCase() : tt('starter', locale).toLowerCase()}`)
  if (counts.offboarding > 0) parts.push(`${counts.offboarding} ${counts.offboarding !== 1 ? tt('leavers', locale).toLowerCase() : tt('leaver', locale).toLowerCase()}`)
  if (counts.migration > 0) parts.push(`${counts.migration} ${counts.migration !== 1 ? tt('mutations', locale).toLowerCase() : tt('mutation', locale).toLowerCase()}`)
  return parts.join(', ')
}

export function renderSummaryBlocks(counts: TypeCounts, locale: EmailLocale = 'nl'): string {
  const blocks: string[] = []

  if (counts.onboarding > 0) {
    blocks.push(
      `<div style="text-align: center; flex: 1; padding: 15px; background: #eff6ff; border-radius: 8px;">` +
      `<div style="font-size: 28px; font-weight: bold; color: #1e40af;">${counts.onboarding}</div>` +
      `<div style="color: #1e40af; font-size: 13px;">🟢 ${counts.onboarding !== 1 ? tt('starters', locale) : tt('starter', locale)}</div>` +
      `</div>`
    )
  }
  if (counts.offboarding > 0) {
    blocks.push(
      `<div style="text-align: center; flex: 1; padding: 15px; background: #fff7ed; border-radius: 8px;">` +
      `<div style="font-size: 28px; font-weight: bold; color: #c2410c;">${counts.offboarding}</div>` +
      `<div style="color: #c2410c; font-size: 13px;">🔴 ${counts.offboarding !== 1 ? tt('leavers', locale) : tt('leaver', locale)}</div>` +
      `</div>`
    )
  }
  if (counts.migration > 0) {
    blocks.push(
      `<div style="text-align: center; flex: 1; padding: 15px; background: #f5f3ff; border-radius: 8px;">` +
      `<div style="font-size: 28px; font-weight: bold; color: #6d28d9;">${counts.migration}</div>` +
      `<div style="color: #6d28d9; font-size: 13px;">🔄 ${counts.migration !== 1 ? tt('mutations', locale) : tt('mutation', locale)}</div>` +
      `</div>`
    )
  }

  if (blocks.length === 0) return ''
  return `<div style="display: flex; gap: 10px; margin: 20px 0;">${blocks.join('')}</div>`
}
