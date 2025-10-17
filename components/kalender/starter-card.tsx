'use client'

import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  startDate: string
  isCancelled?: boolean
  entity?: {
    id: string
    name: string
    colorHex: string
  } | null
}

export function StarterCard({ starter, onClick }: { starter: Starter; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors bg-card ${
        starter.isCancelled ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`font-medium text-sm ${starter.isCancelled ? 'line-through text-muted-foreground' : ''}`}>
            {starter.name}
          </div>
          {starter.language && (
            <span className="text-xs" title={starter.language === 'NL' ? 'Nederlands' : 'Frans'}>
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
      {starter.isCancelled && (
        <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
          ✕ Geannuleerd
        </div>
      )}
      {starter.roleTitle && (
        <div className={`text-xs mb-1 ${starter.isCancelled ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
          {starter.roleTitle}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        {format(new Date(starter.startDate), 'dd MMM', { locale: nl })}
      </div>
    </div>
  )
}

