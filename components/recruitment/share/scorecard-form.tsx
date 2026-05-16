'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { VacancyScorecardCriterion } from '@/lib/recruitment/types'

interface ScorecardFormProps {
  criteria: VacancyScorecardCriterion[]
  shareToken: string
  alreadySubmitted: boolean
  existingScores?: { criterionId: string; score: number }[]
  existingComment?: string | null
}

function RatingDots({
  value,
  onChange,
  disabled,
  criterionId,
}: {
  value: number | null
  onChange: (score: number) => void
  disabled: boolean
  criterionId: string
}) {
  const handleKeyDown = (e: React.KeyboardEvent, current: number) => {
    if (disabled) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (current < 5) onChange(current + 1)
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (current > 1) onChange(current - 1)
    }
  }

  return (
    <div role="radiogroup" aria-labelledby={`criterion-label-${criterionId}`} className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((score) => {
        const isSelected = value !== null && score <= value
        const isChecked = value === score
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-label={String(score)}
            tabIndex={isChecked || (value === null && score === 1) ? 0 : -1}
            disabled={disabled}
            onClick={() => !disabled && onChange(score)}
            onKeyDown={(e) => handleKeyDown(e, score)}
            className={`h-6 w-6 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
              isSelected
                ? 'bg-green-500 border-green-600'
                : 'bg-muted border-muted-foreground/30'
            } ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:border-green-400'}`}
          />
        )
      })}
    </div>
  )
}

export function ScorecardForm({
  criteria,
  shareToken,
  alreadySubmitted,
  existingScores,
  existingComment,
}: ScorecardFormProps) {
  const t = useTranslations('recruitment')

  const [scores, setScores] = useState<Record<string, number>>(() => {
    if (existingScores) {
      return Object.fromEntries(existingScores.map((s) => [s.criterionId, s.score]))
    }
    return {}
  })
  const [comment, setComment] = useState(existingComment ?? '')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>(
    alreadySubmitted ? 'submitted' : 'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const allRated = criteria.every((c) => scores[c.id] != null)
  const isSubmitting = status === 'submitting'
  const canSubmit = allRated && status === 'idle'
  const isReadOnly = status === 'submitted' || isSubmitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setStatus('submitting')
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/recruitment/shared/${shareToken}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores: criteria.map((c) => ({ criterionId: c.id, score: scores[c.id] })),
          comment: comment.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const code = data?.error?.code
        if (code === 'DUPLICATE_SUBMIT') {
          setErrorMessage(t('scorecard.error.duplicateSubmit'))
        } else if (code === 'NO_SCORECARD') {
          setErrorMessage(t('scorecard.error.noScorecard'))
        } else {
          setErrorMessage(t('scorecard.error.generic'))
        }
        setStatus('error')
        return
      }

      setStatus('submitted')
    } catch {
      setErrorMessage(t('scorecard.error.generic'))
      setStatus('error')
    }
  }, [canSubmit, shareToken, criteria, scores, comment, t])

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold">{t('scorecard.title')}</h3>

      <div className="space-y-4">
        {criteria.map((criterion) => (
          <fieldset key={criterion.id} className="space-y-1.5">
            <legend id={`criterion-label-${criterion.id}`} className="text-sm font-medium">
              {criterion.name}
            </legend>
            {criterion.description && (
              <p className="text-xs text-muted-foreground">{criterion.description}</p>
            )}
            <RatingDots
              value={scores[criterion.id] ?? null}
              onChange={(score) => setScores((prev) => ({ ...prev, [criterion.id]: score }))}
              disabled={isReadOnly}
              criterionId={criterion.id}
            />
          </fieldset>
        ))}
      </div>

      <div className="space-y-2">
        <label htmlFor="scorecard-comment" className="text-sm font-medium">
          {t('scorecard.recommendationLabel')}
        </label>
        <Textarea
          id="scorecard-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isReadOnly}
          placeholder={t('scorecard.recommendationLabel')}
          rows={3}
          className="resize-none"
        />
      </div>

      {status === 'submitted' ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">{t('scorecard.submitted')}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('scorecard.submitting')}
              </>
            ) : (
              t('scorecard.submit')
            )}
          </Button>
          {!allRated && status === 'idle' && (
            <p className="text-xs text-muted-foreground text-center">
              {t('scorecard.submitDisabledHint')}
            </p>
          )}
          {errorMessage && (
            <p className="text-xs text-destructive text-center">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  )
}
