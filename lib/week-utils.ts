import { getWeek, startOfWeek } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Europe/Brussels'

/**
 * Berekent het weeknummer (ISO 8601 week, Monday-first) voor een datum
 * @param date - De datum (in Europe/Brussels timezone)
 * @returns Het weeknummer (1-53)
 */
export function calculateWeekNumber(date: Date): number {
  const zonedDate = utcToZonedTime(date, TIMEZONE)
  return getWeek(zonedDate, { weekStartsOn: 1, firstWeekContainsDate: 4 })
}

/**
 * Berekent het jaar voor een datum in Europe/Brussels timezone
 * @param date - De datum
 * @returns Het jaar
 */
export function getYearInTimezone(date: Date): number {
  const zonedDate = utcToZonedTime(date, TIMEZONE)
  return zonedDate.getFullYear()
}

/**
 * Geeft de startdatum van een week in een jaar
 * @param year - Het jaar
 * @param weekNumber - Het weeknummer (1-53)
 * @returns De startdatum van de week (maandag)
 */
export function getWeekStartDate(year: number, weekNumber: number): Date {
  // Start bij 4 januari (bevat altijd week 1 volgens ISO 8601)
  const jan4 = new Date(year, 0, 4)
  const week1Start = startOfWeek(jan4, { weekStartsOn: 1 })
  
  // Voeg het aantal weken toe
  const weekStart = new Date(week1Start)
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7)
  
  return zonedTimeToUtc(weekStart, TIMEZONE)
}

/**
 * Berekent het aantal weken in een jaar
 * @param year - Het jaar
 * @returns Het aantal weken (52 of 53)
 */
export function getWeeksInYear(year: number): number {
  const lastDay = new Date(year, 11, 31)
  const weekNum = calculateWeekNumber(lastDay)
  return weekNum === 1 ? 52 : weekNum
}

/**
 * Haalt de huidige datum in Europe/Brussels timezone
 */
export function getTodayInTimezone(): Date {
  return utcToZonedTime(new Date(), TIMEZONE)
}

