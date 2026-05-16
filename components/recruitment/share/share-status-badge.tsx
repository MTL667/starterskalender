'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ShareStatusBadgeProps {
  expiresAt: string | null
  revokedAt?: string | null
  evaluationSubmittedAt?: string | null
}

export function ShareStatusBadge({ expiresAt, revokedAt, evaluationSubmittedAt }: ShareStatusBadgeProps) {
  const t = useTranslations('recruitment.share')

  if (revokedAt) {
    return <Badge variant="destructive">{t('statusRevoked')}</Badge>
  }

  if (evaluationSubmittedAt) {
    const graceEnd = new Date(new Date(evaluationSubmittedAt).getTime() + 24 * 60 * 60 * 1000)
    if (new Date() > graceEnd) {
      return <Badge variant="secondary">{t('statusEvaluated')}</Badge>
    }
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{t('statusEvaluated')}</Badge>
  }

  if (expiresAt) {
    const expiry = new Date(expiresAt)
    if (expiry < new Date()) {
      return <Badge variant="secondary">{t('statusExpired')}</Badge>
    }
    const diffMs = expiry.getTime() - Date.now()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const timeStr = diffDays <= 1 ? '< 24h' : `${diffDays}d`
    return <Badge variant="default">{t('expiresIn', { time: timeStr })}</Badge>
  }

  return <Badge variant="default">{t('statusActive')}</Badge>
}
