'use client'

import { useTranslations } from 'next-intl'
import type { VacancyDealbreaker, VacancyNiceToHave, CriterionResponse } from '@/lib/recruitment/types'

interface CriteriaQuestionsProps {
  dealbreakers: VacancyDealbreaker[]
  niceToHaves: VacancyNiceToHave[]
  responses: CriterionResponse[]
  onResponsesChange: (responses: CriterionResponse[]) => void
}

export function CriteriaQuestions({
  dealbreakers,
  niceToHaves,
  responses,
  onResponsesChange,
}: CriteriaQuestionsProps) {
  const t = useTranslations('public.apply.criteria')

  if (dealbreakers.length === 0 && niceToHaves.length === 0) return null

  function updateResponse(criterionId: string, value: CriterionResponse['value']) {
    const updated = responses.filter((r) => r.criterionId !== criterionId)
    updated.push({ criterionId, value })
    onResponsesChange(updated)
  }

  function getResponseValue(criterionId: string): CriterionResponse['value'] | undefined {
    return responses.find((r) => r.criterionId === criterionId)?.value
  }

  return (
    <div className="space-y-6">
      {dealbreakers.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t('dealbreakersTitle')}</legend>
          {dealbreakers.map((db) => (
            <CriterionField
              key={db.id}
              criterion={db}
              value={getResponseValue(db.id)}
              required
              onChange={(v) => updateResponse(db.id, v)}
              t={t}
            />
          ))}
        </fieldset>
      )}

      {niceToHaves.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t('niceToHavesTitle')}</legend>
          {niceToHaves.map((nth) => (
            <NiceToHaveField
              key={nth.id}
              criterion={nth}
              value={getResponseValue(nth.id)}
              onChange={(v) => updateResponse(nth.id, v)}
              t={t}
            />
          ))}
        </fieldset>
      )}
    </div>
  )
}

function CriterionField({
  criterion,
  value,
  required,
  onChange,
  t,
}: {
  criterion: VacancyDealbreaker
  value: CriterionResponse['value'] | undefined
  required: boolean
  onChange: (v: CriterionResponse['value']) => void
  t: any
}) {
  return (
    <div className="rounded-lg border p-3 space-y-1.5">
      <label className="text-sm font-medium block">
        {criterion.name}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {criterion.label && (
        <p className="text-xs text-muted-foreground">{criterion.label}</p>
      )}

      {criterion.type === 'boolean' && (
        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm min-h-[44px]">
            <input
              type="radio"
              name={`db-${criterion.id}`}
              checked={value === true}
              onChange={() => onChange(true)}
              className="h-4 w-4"
            />
            {t('booleanYes')}
          </label>
          <label className="flex items-center gap-2 text-sm min-h-[44px]">
            <input
              type="radio"
              name={`db-${criterion.id}`}
              checked={value === false}
              onChange={() => onChange(false)}
              className="h-4 w-4"
            />
            {t('booleanNo')}
          </label>
        </div>
      )}

      {criterion.type === 'minimum' && (
        <input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : 0)}
          placeholder={t('minimumLabel', { value: criterion.requiredValue })}
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[44px]"
          min={0}
        />
      )}

      {criterion.type === 'selection' && (
        <div className="space-y-1 pt-1">
          {(criterion.requiredValue as string[]).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm min-h-[44px]">
              <input
                type="checkbox"
                checked={Array.isArray(value) ? value.includes(option) : value === option}
                onChange={(e) => {
                  const current = Array.isArray(value) ? value : []
                  const next = e.target.checked
                    ? [...current, option]
                    : current.filter((v) => v !== option)
                  onChange(next)
                }}
                className="h-4 w-4"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function NiceToHaveField({
  criterion,
  value,
  onChange,
  t,
}: {
  criterion: VacancyNiceToHave
  value: CriterionResponse['value'] | undefined
  onChange: (v: CriterionResponse['value']) => void
  t: any
}) {
  return (
    <div className="rounded-lg border p-3 space-y-1.5">
      <label className="text-sm font-medium block">{criterion.name}</label>

      {criterion.type === 'boolean' && (
        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm min-h-[44px]">
            <input
              type="radio"
              name={`nth-${criterion.id}`}
              checked={value === true}
              onChange={() => onChange(true)}
              className="h-4 w-4"
            />
            {t('booleanYes')}
          </label>
          <label className="flex items-center gap-2 text-sm min-h-[44px]">
            <input
              type="radio"
              name={`nth-${criterion.id}`}
              checked={value === false}
              onChange={() => onChange(false)}
              className="h-4 w-4"
            />
            {t('booleanNo')}
          </label>
        </div>
      )}

      {criterion.type === 'scale' && (
        <div className="flex gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex items-center gap-1 text-sm min-h-[44px]">
              <input
                type="radio"
                name={`nth-${criterion.id}`}
                checked={value === n}
                onChange={() => onChange(n)}
                className="h-4 w-4"
              />
              {n}
            </label>
          ))}
        </div>
      )}

    </div>
  )
}
