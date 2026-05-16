'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2 } from 'lucide-react'
import { ShareStatusBadge } from './share-status-badge'

interface ShareEntry {
  id: string
  sharedWith: { id: string; name: string | null; email: string }
  createdBy: { id: string; name: string | null }
  visibleFields: string[]
  expiresAt: string | null
  evaluationSubmittedAt: string | null
  createdAt: string
  isExpired: boolean
}

interface SharesTabProps {
  candidateId: string
}

export function SharesTab({ candidateId }: SharesTabProps) {
  const t = useTranslations('recruitment.share')
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/recruitment/candidates/${candidateId}/share`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json) => setShares(json.data ?? []))
      .catch(() => setShares([]))
      .finally(() => setLoading(false))
  }, [candidateId])

  async function handleRevoke(shareId: string) {
    if (!confirm(t('revokeConfirm', { name: shares.find((s) => s.id === shareId)?.sharedWith.name ?? '' }))) return
    setRevoking(shareId)
    try {
      const res = await fetch(`/api/recruitment/candidates/${candidateId}/share/${shareId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShares((prev) => prev.filter((s) => s.id !== shareId))
      }
    } catch {
      // silent
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (shares.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">{t('noShares')}</p>
    )
  }

  return (
    <div className="space-y-3">
      {shares.map((share) => (
        <div key={share.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{share.sharedWith.name ?? share.sharedWith.email}</span>
              <ShareStatusBadge
                expiresAt={share.expiresAt}
                evaluationSubmittedAt={share.evaluationSubmittedAt}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(share.createdAt).toLocaleDateString('nl-BE', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {' · '}
              {share.visibleFields.length} velden
            </div>
          </div>
          {!share.isExpired && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRevoke(share.id)}
              disabled={revoking === share.id}
              className="text-destructive hover:text-destructive shrink-0"
            >
              {revoking === share.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
