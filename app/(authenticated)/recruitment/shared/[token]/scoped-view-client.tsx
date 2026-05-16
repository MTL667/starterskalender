'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, Clock, Shield } from 'lucide-react'
import { CandidateScopedCard } from '@/components/recruitment/share/candidate-scoped-card'
import { ScorecardForm } from '@/components/recruitment/share/scorecard-form'
import type { MaskedCandidate } from '@/lib/recruitment/field-mask'
import type { VacancyScorecardCriterion } from '@/lib/recruitment/types'

interface ScopedViewClientProps {
  candidate: MaskedCandidate | null
  vacancyTitle: string
  sharedByName: string
  sharedAt: string
  isRevoked: boolean
  isExpired: boolean
  evaluationSubmittedAt: string | null
  evaluationGraceEnd: string | null
  shareToken: string
  scorecardCriteria: VacancyScorecardCriterion[]
  existingEvaluation: {
    scores: { criterionId: string; score: number }[]
    comment: string | null
  } | null
}

export function ScopedViewClient({
  candidate,
  vacancyTitle,
  sharedByName,
  sharedAt,
  isRevoked,
  isExpired,
  evaluationSubmittedAt,
  evaluationGraceEnd,
  shareToken,
  scorecardCriteria,
  existingEvaluation,
}: ScopedViewClientProps) {
  const t = useTranslations('recruitment')

  const sharedDate = new Date(sharedAt).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (isRevoked) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">{t('scopedView.revoked')}</h1>
      </div>
    )
  }

  if (isExpired && !evaluationSubmittedAt) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">{t('scopedView.expired')}</h1>
      </div>
    )
  }

  if (isExpired && evaluationSubmittedAt) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">{t('scopedView.evaluationSubmitted')}</h1>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Attribution header */}
      <div className="mb-6 pb-4 border-b">
        <p className="text-sm text-muted-foreground">
          {t('scopedView.sharedBy', { name: sharedByName, date: sharedDate })}
        </p>
        {evaluationSubmittedAt && evaluationGraceEnd && (
          <p className="text-sm text-amber-600 mt-1">
            {t('scopedView.evaluationGrace', {
              date: new Date(evaluationGraceEnd).toLocaleDateString('nl-BE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            })}
          </p>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: candidate data */}
        <div className="bg-card border rounded-lg p-6">
          {candidate ? (
            <CandidateScopedCard candidate={candidate} vacancyTitle={vacancyTitle} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('scopedView.noFieldsVisible')}</p>
          )}
        </div>

        {/* Right: scorecard */}
        <div className="bg-card border rounded-lg p-6">
          {scorecardCriteria.length > 0 ? (
            <ScorecardForm
              criteria={scorecardCriteria}
              shareToken={shareToken}
              alreadySubmitted={!!evaluationSubmittedAt}
              existingScores={existingEvaluation?.scores}
              existingComment={existingEvaluation?.comment}
            />
          ) : (
            <>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">{t('scopedView.scorecard')}</h3>
              <p className="text-sm text-muted-foreground">{t('scopedView.scorecardPlaceholder')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
