export const SHAREABLE_FIELDS = {
  personal: ['firstName', 'lastName', 'email', 'phone'] as const,
  professional: ['source', 'niceToHaveScore', 'dealbreakersResult'] as const,
  documents: ['cv', 'motivation'] as const,
  meta: ['appliedAt', 'verifiedAt', 'stage'] as const,
} as const

export const ALL_SHAREABLE_FIELD_KEYS = Object.values(SHAREABLE_FIELDS).flat()

export type ShareableField = (typeof ALL_SHAREABLE_FIELD_KEYS)[number]

export interface MaskedCandidate {
  id: string
  [key: string]: unknown
}

/**
 * Strips candidate data to only the fields listed in visibleFields.
 * Non-visible fields are omitted from the returned object — never sent to client.
 */
export function maskCandidateForViewer(
  candidate: Record<string, unknown>,
  visibleFields: string[]
): MaskedCandidate {
  const masked: MaskedCandidate = { id: candidate.id as string }

  for (const field of visibleFields) {
    if (!ALL_SHAREABLE_FIELD_KEYS.includes(field as ShareableField)) continue

    if (field === 'cv') {
      if (candidate.application && typeof candidate.application === 'object') {
        const app = candidate.application as Record<string, unknown>
        masked.cv = {
          cvDriveId: app.cvDriveId ?? null,
          cvItemId: app.cvItemId ?? null,
          cvFileName: app.cvFileName ?? null,
        }
      }
      continue
    }

    if (field === 'motivation') {
      if (candidate.application && typeof candidate.application === 'object') {
        masked.motivation = (candidate.application as Record<string, unknown>).motivation ?? null
      }
      continue
    }

    if (field === 'appliedAt') {
      if (candidate.application && typeof candidate.application === 'object') {
        masked.appliedAt = (candidate.application as Record<string, unknown>).appliedAt ?? null
      }
      continue
    }

    if (field === 'verifiedAt') {
      masked.verifiedAt = candidate.verifiedAt ?? null
      continue
    }

    if (field === 'stage') {
      masked.stage = candidate.stage ?? null
      continue
    }

    if (field in candidate) {
      masked[field] = candidate[field]
    }
  }

  return masked
}

/**
 * Returns the field category for a given field key.
 */
export function getFieldCategory(field: string): string | null {
  for (const [category, fields] of Object.entries(SHAREABLE_FIELDS)) {
    if ((fields as readonly string[]).includes(field)) return category
  }
  return null
}
