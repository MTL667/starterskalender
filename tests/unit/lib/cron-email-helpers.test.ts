import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  tt,
  getDateLocale,
  countByType,
  buildSubjectParts,
  renderSummaryBlocks,
  renderStarterItem,
  renderEntitySection,
  groupByEntity,
  type EmailLocale,
} from '@/lib/cron-email-helpers'

const fixedDate = new Date('2024-06-15T12:00:00.000Z')

describe('tt', () => {
  it.each<[string, EmailLocale, string]>([
    ['hello', 'nl', 'Hallo'],
    ['hello', 'fr', 'Bonjour'],
    ['starters', 'nl', 'Starters'],
    ['starters', 'fr', 'Starters'],
    ['unknownKeyThatDoesNotExist', 'fr', 'unknownKeyThatDoesNotExist'],
  ])('resolves %s for locale %s', (key, locale, expected) => {
    expect(tt(key, locale)).toBe(expected)
  })

  it('falls back to nl when fr entry is missing', () => {
    expect(tt('dateUnknown', 'nl')).toBe('Datum onbekend')
  })
})

describe('getDateLocale', () => {
  it('maps nl to nl-BE and fr to fr-BE', () => {
    expect(getDateLocale('nl')).toBe('nl-BE')
    expect(getDateLocale('fr')).toBe('fr-BE')
  })
})

describe('countByType', () => {
  it('counts onboarding as default and tracks each type', () => {
    const starters = [
      { type: 'ONBOARDING' },
      { type: 'ONBOARDING' },
      { type: 'OFFBOARDING' },
      { type: 'MIGRATION' },
      { type: 'OTHER' },
    ] as any[]
    expect(countByType(starters as any)).toEqual({
      onboarding: 3,
      offboarding: 1,
      migration: 1,
      total: 5,
    })
  })

  it('returns zeros for empty list', () => {
    expect(countByType([])).toEqual({
      onboarding: 0,
      offboarding: 0,
      migration: 0,
      total: 0,
    })
  })
})

describe('groupByEntity', () => {
  it('groups by entity name and uses unknown label when entity is null (nl/fr)', () => {
    const base = {
      id: '1',
      firstName: 'A',
      lastName: 'B',
      type: 'ONBOARDING',
      language: 'NL',
      roleTitle: null,
      startDate: null,
      entity: null,
    }
    expect(groupByEntity([base as any], 'nl')).toMatchSnapshot('nl-unknown-entity')
    expect(groupByEntity([base as any], 'fr')).toMatchSnapshot('fr-unknown-entity')
  })

  it('groups multiple starters under same entity name', () => {
    const entity = { name: 'Acme' }
    const a = {
      id: '1',
      firstName: 'A',
      lastName: 'One',
      type: 'ONBOARDING',
      language: 'NL',
      roleTitle: null,
      startDate: null,
      entity,
    }
    const b = { ...a, id: '2', firstName: 'B' }
    const grouped = groupByEntity([a as any, b as any], 'nl')
    expect(Object.keys(grouped)).toEqual(['Acme'])
    expect(grouped.Acme).toHaveLength(2)
  })
})

describe('rendering (snapshots, deterministic dates)', () => {
  beforeEach(() => {
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function (
      this: Date,
      locale?: string,
    ) {
      if (locale === 'nl-BE') return '15 juni 2024'
      if (locale === 'fr-BE') return '15 juin 2024'
      return '15/06/2024'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const onboardingNL = {
    id: 's1',
    firstName: 'Jan',
    lastName: 'Peeters',
    type: 'ONBOARDING',
    language: 'NL',
    roleTitle: 'Technicus',
    startDate: fixedDate,
    entity: { name: 'Entity A' },
  }

  const onboardingFR = { ...onboardingNL, language: 'FR' }

  const offboarding = {
    id: 's2',
    firstName: 'Marie',
    lastName: 'Dupont',
    type: 'OFFBOARDING',
    language: 'FR',
    roleTitle: null,
    startDate: fixedDate,
    entity: { name: 'Entity A' },
  }

  const migration = {
    id: 's3',
    firstName: 'Koen',
    lastName: 'Verhoeven',
    type: 'MIGRATION',
    language: 'NL',
    roleTitle: 'Planner',
    startDate: fixedDate,
    fromEntity: { name: 'Old NV' },
    entity: { name: 'New BV' },
  }

  it('renderStarterItem matches snapshot for nl and fr', () => {
    expect(renderStarterItem(onboardingNL as any, 'nl')).toMatchSnapshot('starter-onboarding-nl')
    expect(renderStarterItem(onboardingFR as any, 'fr')).toMatchSnapshot('starter-onboarding-fr')
    expect(renderStarterItem(offboarding as any, 'nl')).toMatchSnapshot('starter-offboarding-nl')
    expect(renderStarterItem(offboarding as any, 'fr')).toMatchSnapshot('starter-offboarding-fr')
    expect(renderStarterItem(migration as any, 'nl')).toMatchSnapshot('starter-migration-nl')
    expect(renderStarterItem(migration as any, 'fr')).toMatchSnapshot('starter-migration-fr')
  })

  it('renderStarterItem uses date unknown copy when startDate is null', () => {
    const noDate = { ...onboardingNL, startDate: null }
    expect(renderStarterItem(noDate as any, 'nl')).toMatchSnapshot('starter-no-date-nl')
    expect(renderStarterItem(noDate as any, 'fr')).toMatchSnapshot('starter-no-date-fr')
  })

  it('renderEntitySection matches snapshot for nl and fr', () => {
    const items = [
      { ...onboardingNL, id: 'a' },
      { ...offboarding, id: 'b', firstName: 'X' },
    ]
    expect(renderEntitySection('Section X', items as any, 'nl')).toMatchSnapshot('entity-section-nl')
    expect(renderEntitySection('Section X', items as any, 'fr')).toMatchSnapshot('entity-section-fr')
  })

  it('buildSubjectParts matches snapshot for nl and fr', () => {
    const counts = { onboarding: 2, offboarding: 1, migration: 3, total: 6 }
    expect(buildSubjectParts(counts, 'nl')).toMatchSnapshot('subject-nl')
    expect(buildSubjectParts(counts, 'fr')).toMatchSnapshot('subject-fr')
    expect(buildSubjectParts({ onboarding: 1, offboarding: 1, migration: 1, total: 3 }, 'nl')).toMatchSnapshot(
      'subject-singular-nl',
    )
    expect(buildSubjectParts({ onboarding: 1, offboarding: 1, migration: 1, total: 3 }, 'fr')).toMatchSnapshot(
      'subject-singular-fr',
    )
  })

  it('renderSummaryBlocks matches snapshot for nl and fr', () => {
    const mixed = { onboarding: 2, offboarding: 1, migration: 1, total: 4 }
    expect(renderSummaryBlocks(mixed, 'nl')).toMatchSnapshot('summary-mixed-nl')
    expect(renderSummaryBlocks(mixed, 'fr')).toMatchSnapshot('summary-mixed-fr')
  })

  it('renderSummaryBlocks returns empty string when all counts are zero', () => {
    const zero = { onboarding: 0, offboarding: 0, migration: 0, total: 0 }
    expect(renderSummaryBlocks(zero, 'nl')).toBe('')
    expect(renderSummaryBlocks(zero, 'fr')).toBe('')
  })
})
