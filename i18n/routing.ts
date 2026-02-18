export const locales = ['nl', 'fr'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'nl'
