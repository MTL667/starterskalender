'use client'

import { useTranslations } from 'next-intl'
import { SHAREABLE_FIELDS } from '@/lib/recruitment/field-mask'

interface FieldPickerProps {
  selectedFields: string[]
  onChange: (fields: string[]) => void
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  firstName: 'fieldFirstName',
  lastName: 'fieldLastName',
  email: 'fieldEmail',
  phone: 'fieldPhone',
  source: 'fieldSource',
  niceToHaveScore: 'fieldNiceToHaveScore',
  dealbreakersResult: 'fieldDealbreakersResult',
  cv: 'fieldCv',
  motivation: 'fieldMotivation',
  appliedAt: 'fieldAppliedAt',
  verifiedAt: 'fieldVerifiedAt',
  stage: 'fieldStage',
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  personal: 'categoryPersonal',
  professional: 'categoryProfessional',
  documents: 'categoryDocuments',
  meta: 'categoryMeta',
}

export function FieldPicker({ selectedFields, onChange }: FieldPickerProps) {
  const t = useTranslations('recruitment.share')
  const fieldSet = new Set(selectedFields)

  function toggle(field: string) {
    const next = new Set(fieldSet)
    if (next.has(field)) {
      next.delete(field)
    } else {
      next.add(field)
    }
    onChange(Array.from(next))
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(SHAREABLE_FIELDS).map(([category, fields]) => (
        <fieldset key={category} className="space-y-2">
          <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t(CATEGORY_LABEL_KEYS[category] ?? category)}
          </legend>
          {fields.map((field) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={fieldSet.has(field)}
                onChange={() => toggle(field)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{t(FIELD_LABEL_KEYS[field] ?? field)}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  )
}
