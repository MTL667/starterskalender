'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface LinkedEmailItem {
  id: string
  subject: string
  preview: string
  direction: 'SENT' | 'RECEIVED'
  sentAt: string
  isPrivate: boolean
  userId: string
}

interface EmailsTabProps {
  candidateId: string
  currentUserId?: string
}

export function EmailsTab({ candidateId, currentUserId }: EmailsTabProps) {
  const t = useTranslations('recruitment.emails')
  const [emails, setEmails] = useState<LinkedEmailItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch(`/api/recruitment/candidates/${candidateId}/emails`)
      if (res.ok) {
        const { data } = await res.json()
        setEmails(data)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [candidateId])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  async function togglePrivacy(emailId: string, isPrivate: boolean) {
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isPrivate: !isPrivate } : e))
    try {
      await fetch(`/api/recruitment/candidates/${candidateId}/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: !isPrivate }),
      })
    } catch {
      setEmails(prev => prev.map(e => e.id === emailId ? { ...e, isPrivate } : e))
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">{t('loading')}</p>
  }

  if (emails.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{t('empty')}</p>
  }

  return (
    <div className="space-y-2 max-h-[340px] overflow-y-auto">
      {emails.map((email) => (
        <div
          key={email.id}
          className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {email.direction === 'SENT' ? (
                <ArrowUpRight className="h-4 w-4 text-blue-500 shrink-0" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 text-green-500 shrink-0" />
              )}
              <span className="text-sm font-medium truncate">{email.subject}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {email.isPrivate && (
                <Badge variant="outline" className="text-[10px]">{t('private')}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true, locale: nl })}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.preview}</p>
          {currentUserId && email.userId === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 text-xs"
              onClick={() => togglePrivacy(email.id, email.isPrivate)}
            >
              {email.isPrivate ? (
                <><Unlock className="h-3 w-3 mr-1" />{t('makeVisible')}</>
              ) : (
                <><Lock className="h-3 w-3 mr-1" />{t('markPrivate')}</>
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
