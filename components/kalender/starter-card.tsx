'use client'

import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Starter {
  id: string
  name: string
  roleTitle?: string | null
  startDate: string
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
      className="border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors bg-card"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-sm">{starter.name}</div>
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
      {starter.roleTitle && (
        <div className="text-xs text-muted-foreground mb-1">
          {starter.roleTitle}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        {format(new Date(starter.startDate), 'dd MMM', { locale: nl })}
      </div>
    </div>
  )
}

