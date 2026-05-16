'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Phone, FileText, Calendar } from 'lucide-react'
interface CandidateScopedCardProps {
  candidate: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    source?: string
    niceToHaveScore?: number | null
    dealbreakersResult?: string
    cv?: { cvDriveId: string | null; cvItemId: string | null; cvFileName: string | null } | null
    motivation?: string | null
    appliedAt?: string | null
    verifiedAt?: string | null
    stage?: { id: string; name: string; order: number } | null
    [key: string]: unknown
  }
  vacancyTitle: string
}

export function CandidateScopedCard({ candidate, vacancyTitle }: CandidateScopedCardProps) {
  const t = useTranslations('recruitment')

  const hasPersonal = Boolean(candidate.firstName || candidate.lastName || candidate.email || candidate.phone)
  const hasProfessional = candidate.source !== undefined || candidate.niceToHaveScore !== undefined || candidate.dealbreakersResult !== undefined
  const hasCv = Boolean(candidate.cv)
  const hasMotivation = typeof candidate.motivation === 'string'
  const hasStage = Boolean(candidate.stage)

  return (
    <div className="space-y-6">
      {/* Vacancy context */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{t('pipeline.sectionTitle')}</h3>
        <p className="text-sm mt-1">{vacancyTitle}</p>
      </div>

      {/* Personal info */}
      {hasPersonal && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('share.categoryPersonal')}</h3>
          <div className="space-y-2">
            {(candidate.firstName || candidate.lastName) ? (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                {[candidate.firstName, candidate.lastName].filter(Boolean).join(' ')}
              </div>
            ) : null}
            {candidate.email ? (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {candidate.email}
              </div>
            ) : null}
            {candidate.phone ? (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {candidate.phone}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Professional */}
      {hasProfessional && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('share.categoryProfessional')}</h3>
          <div className="flex flex-wrap gap-2">
            {candidate.source !== undefined ? (
              <Badge variant="outline">{`${t('share.fieldSource')}: ${candidate.source}`}</Badge>
            ) : null}
            {candidate.niceToHaveScore != null ? (
              <Badge variant="secondary">{`${t('share.fieldNiceToHaveScore')}: ${candidate.niceToHaveScore.toFixed(1)}`}</Badge>
            ) : null}
            {candidate.dealbreakersResult !== undefined ? (
              <Badge variant={candidate.dealbreakersResult === 'PASS' ? 'default' : 'destructive'}>
                {candidate.dealbreakersResult}
              </Badge>
            ) : null}
          </div>
        </div>
      )}

      {candidate.stage ? (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('share.fieldStage')}</h3>
          <Badge variant="secondary">{candidate.stage.name}</Badge>
        </div>
      ) : null}

      {/* CV — download via share-token endpoint is not yet available; show filename only */}
      {candidate.cv ? (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('share.fieldCv')}</h3>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{candidate.cv.cvFileName ?? 'CV'}</span>
          </div>
        </div>
      ) : null}

      {/* Motivation */}
      {hasMotivation && candidate.motivation ? (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('share.fieldMotivation')}</h3>
          <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{candidate.motivation}</p>
        </div>
      ) : null}

      {candidate.appliedAt ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {`${t('share.fieldAppliedAt')}: ${new Date(candidate.appliedAt).toLocaleDateString('nl-BE')}`}
        </div>
      ) : null}

      {/* No fields fallback */}
      {!hasPersonal && !hasProfessional && !hasCv && !hasMotivation && !hasStage && (
        <p className="text-sm text-muted-foreground">{t('scopedView.noFieldsVisible')}</p>
      )}
    </div>
  )
}
