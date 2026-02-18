import { nl } from 'date-fns/locale'
import { fr } from 'date-fns/locale'
import type { Locale } from 'date-fns'

const localeMap: Record<string, Locale> = { nl, fr }

export function getDateLocale(locale: string): Locale {
  return localeMap[locale] || nl
}
