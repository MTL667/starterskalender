'use client'

import { useTranslations } from 'next-intl'
import { History, ArrowRight } from 'lucide-react'
import type { TaskReassignmentEntry } from '@/lib/types'

interface TaskReassignHistoryProps {
  history?: TaskReassignmentEntry[]
  users: Array<{ id: string; name: string | null; email: string }>
}

export function TaskReassignHistory({ history, users }: TaskReassignHistoryProps) {
  const t = useTranslations('tasks')

  if (!history || history.length === 0) return null

  function nameOf(userId: string | null | undefined) {
    if (!userId) return '—'
    const u = users.find(u => u.id === userId)
    if (!u) return userId
    return u.name || u.email
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('reassignHistory')}</span>
      </div>
      <div className="space-y-1 border rounded-md p-2 bg-muted/40 text-xs">
        {history.map((h) => (
          <div key={h.id} className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {new Date(h.reassignedAt).toLocaleString('nl-BE')}
            </span>
            <span>{nameOf(h.fromUserId)}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{nameOf(h.toUserId)}</span>
            {h.reason && (
              <span className="text-muted-foreground italic ml-1">— {h.reason}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
