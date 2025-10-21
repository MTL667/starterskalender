/**
 * Utility functions voor ervaring berekeningen
 */

import { differenceInMonths, differenceInYears } from 'date-fns'

export interface ExperienceDuration {
  years: number
  months: number
  totalMonths: number
}

/**
 * Bereken de duur van ervaring sinds een startdatum tot vandaag
 * @param since Startdatum van ervaring
 * @returns Object met jaren, maanden en totaal aantal maanden
 */
export function calculateExperienceDuration(since: Date | string): ExperienceDuration {
  const startDate = typeof since === 'string' ? new Date(since) : since
  const today = new Date()
  
  const totalMonths = differenceInMonths(today, startDate)
  const years = differenceInYears(today, startDate)
  const months = totalMonths - (years * 12)
  
  return {
    years,
    months,
    totalMonths,
  }
}

/**
 * Format ervaring duur als leesbare string
 * @param duration ExperienceDuration object
 * @returns Geformatteerde string zoals "2 jaar, 3 maanden" of "5 maanden"
 */
export function formatExperienceDuration(duration: ExperienceDuration): string {
  const parts: string[] = []
  
  if (duration.years > 0) {
    parts.push(`${duration.years} ${duration.years === 1 ? 'jaar' : 'jaar'}`)
  }
  
  if (duration.months > 0) {
    parts.push(`${duration.months} ${duration.months === 1 ? 'maand' : 'maanden'}`)
  }
  
  if (parts.length === 0) {
    return '< 1 maand'
  }
  
  return parts.join(', ')
}

/**
 * Bereken en format ervaring duur in één functie
 * @param since Startdatum van ervaring
 * @returns Geformatteerde string
 */
export function getExperienceText(since: Date | string): string {
  const duration = calculateExperienceDuration(since)
  return formatExperienceDuration(duration)
}

