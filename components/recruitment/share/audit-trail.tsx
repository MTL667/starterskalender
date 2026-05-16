'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Eye, Share2, ShieldOff, FileText, ArrowRight, ClipboardCheck } from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  meta: Record<string, any> | null
  createdAt: string
  actor: { id: string; name: string | null } | null
}

const ACTION_ICONS: Record<string, typeof Eye> = {
  CANDIDATE_VIEWED: Eye,
  CANDIDATE_SHARED: Share2,
  CANDIDATE_SHARE_REVOKED: ShieldOff,
  CANDIDATE_DOCUMENT_ACCESSED: FileText,
  CANDIDATE_STAGE_MOVE: ArrowRight,
  CANDIDATE_EVALUATED: ClipboardCheck,
}

interface AuditTrailProps {
  candidateId: string
}

export function AuditTrail({ candidateId }: AuditTrailProps) {
  const t = useTranslations('recruitment.audit')
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/recruitment/candidates/${candidateId}/audit`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => setEntries(json.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [candidateId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t('noHistory')}</p>
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const Icon = ACTION_ICONS[entry.action] ?? Eye
        const description = formatAction(entry, t)
        const dateStr = new Date(entry.createdAt).toLocaleDateString('nl-BE', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div key={entry.id} className="flex items-start gap-3 text-sm py-2 border-b last:border-0">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.actor?.name ?? 'System'} · {dateStr}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatAction(entry: AuditEntry, t: ReturnType<typeof useTranslations>): string {
  const meta = entry.meta ?? {}

  switch (entry.action) {
    case 'CANDIDATE_VIEWED': {
      const mechanism = meta.mechanism === 'share-link' ? t('viaShareLink') : t('viaDirect')
      return `${t('candidateViewed')} ${mechanism}`
    }
    case 'CANDIDATE_SHARED':
      return t('candidateShared', { name: meta.sharedWithName ?? 'Unknown' })
    case 'CANDIDATE_SHARE_REVOKED':
      return t('shareRevoked', { name: meta.revokedUserName ?? 'Unknown' })
    case 'CANDIDATE_EVALUATED':
      return t('candidateEvaluated', { name: entry.actor?.name ?? 'Unknown' })
    case 'CANDIDATE_DOCUMENT_ACCESSED':
      return t('documentAccessed', { fileName: meta.fileName ?? 'Document' })
    case 'CANDIDATE_STAGE_MOVE':
      return t('stageMove', { from: meta.fromStageName ?? '?', to: meta.toStageName ?? '?' })
    default:
      return entry.action
  }
}
