'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { useLocale } from 'next-intl'
import { getDateLocale } from '@/lib/date-locale'
import { PlaneLanding, PlaneTakeoff, ArrowLeftRight, Clock } from 'lucide-react'
import { HealthDot } from '@/components/health-badge'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
  firstName: string
  lastName: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  contractSignedOn?: string | null
  startDate: string | null
  isPendingBoarding?: boolean
  isCancelled?: boolean
  entity?: {
    id: string
    name: string
    colorHex: string
  } | null
}

export function StarterCard({ starter, onClick, healthLevel }: { starter: Starter; onClick: () => void; healthLevel?: 'green' | 'orange' | 'red' }) {
  const t = useTranslations('starterCard')
  const dateLocale = getDateLocale(useLocale())
  const isMigration = starter.type === 'MIGRATION'
  const isOffboarding = starter.type === 'OFFBOARDING'

  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors bg-card ${
        starter.isCancelled ? 'opacity-60' : ''
      } ${isMigration ? 'border-l-4 border-l-blue-400 dark:border-l-blue-600' : isOffboarding ? 'border-l-4 border-l-red-400 dark:border-l-red-600' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isMigration ? (
            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          ) : isOffboarding ? (
            <PlaneTakeoff className="h-3.5 w-3.5 text-red-500 shrink-0" />
          ) : (
            <PlaneLanding className="h-3.5 w-3.5 text-green-500 shrink-0" />
          )}
          <div className={`font-medium text-sm truncate ${starter.isCancelled ? 'line-through text-muted-foreground' : ''}`}>
            {starter.firstName} {starter.lastName}
          </div>
          {healthLevel && !starter.isCancelled && (
            <HealthDot level={healthLevel} />
          )}
          {starter.language && (
            <span className="text-xs shrink-0" title={starter.language === 'NL' ? t('languageNL') : t('languageFR')}>
              {starter.language === 'NL' ? '🇳🇱' : '🇫🇷'}
            </span>
          )}
        </div>
        {starter.entity && (
          <Badge
            className="text-xs shrink-0"
            style={{
              backgroundColor: starter.entity.colorHex,
              color: 'white',
            }}
          >
            {starter.entity.name}
          </Badge>
        )}
      </div>

      {/* Geannuleerd status */}
      {starter.isCancelled && (
        <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-2">
          {t('cancelled')}
        </div>
      )}

      {/* Functie */}
      {starter.roleTitle && (
        <div className={`text-xs mb-1.5 ${starter.isCancelled ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
          <span className="font-medium">{t('labelRole')}</span> {starter.roleTitle}
        </div>
      )}

      {/* Regio en Via op één regel */}
      {(starter.region || starter.via) && (
        <div className={`text-xs mb-1.5 flex flex-wrap gap-x-3 ${starter.isCancelled ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
          {starter.region && (
            <span>
              <span className="font-medium">{t('labelRegion')}</span> {starter.region}
            </span>
          )}
          {starter.via && (
            <span>
              <span className="font-medium">{t('labelVia')}</span> {starter.via}
            </span>
          )}
        </div>
      )}

      {/* Datum */}
      {starter.isPendingBoarding ? (
        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">
          <Clock className="h-3 w-3" />
          {t('pendingBoarding')}
        </div>
      ) : starter.startDate ? (
        <div className="text-xs text-muted-foreground mb-2">
          <span className="font-medium">{isMigration ? t('labelMigration') : isOffboarding ? t('labelDeparture') : t('labelStart')}</span> {format(new Date(starter.startDate), 'dd MMM yyyy', { locale: dateLocale })}
        </div>
      ) : null}

      {/* Extra info (notes) */}
      {starter.notes && (
        <div className={`text-xs mt-2 pt-2 border-t ${starter.isCancelled ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
          <div className="font-medium mb-1">{t('labelExtraInfo')}</div>
          <div className="whitespace-pre-wrap break-words line-clamp-3">
            {starter.notes}
          </div>
        </div>
      )}
    </div>
  )
}

