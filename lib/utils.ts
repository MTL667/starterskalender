import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeString(str: string | null | undefined): string | null {
  if (!str) return null
  return str.trim().replace(/\s+/g, ' ')
}

