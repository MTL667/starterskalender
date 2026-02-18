'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { useLocale } from 'next-intl'
import { getDateLocale } from '@/lib/date-locale'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  contractSignedOn?: string | null
  startDate: string
  isCancelled?: boolean
  entity?: {
    id: string
    name: string
    colorHex: string
  } | null
}

export function StarterCard({ starter, onClick }: { starter: Starter; onClick: () => void }) {
  const t = useTranslations('starterCard')
  const dateLocale = getDateLocale(useLocale())
  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors bg-card ${
        starter.isCancelled ? 'opacity-60' : ''
      }`}
    >
      {/* Header: Naam + Taal + Entiteit */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className={`font-medium text-sm truncate ${starter.isCancelled ? 'line-through text-muted-foreground' : ''}`}>
            {starter.name}
          </div>
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

      {/* Startdatum */}
      <div className="text-xs text-muted-foreground mb-2">
        <span className="font-medium">{t('labelStart')}</span> {format(new Date(starter.startDate), 'dd MMM yyyy', { locale: dateLocale })}
      </div>

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

