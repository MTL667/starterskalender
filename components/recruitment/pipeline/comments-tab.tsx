'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { useSSE } from '@/components/providers/sse-provider'
import type { SSEEvent } from '@/lib/events'

interface Comment {
  id: string
  text: string
  createdAt: string
  author: { id: string; name: string }
}

interface CommentsTabProps {
  candidateId: string
}

export function CommentsTab({ candidateId }: CommentsTabProps) {
  const t = useTranslations('recruitment.comments')
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const handleSSE = useCallback((event: SSEEvent) => {
    const payload = event.payload as any
    if (payload?.candidateId === candidateId && payload?.comment) {
      const newComment = payload.comment as Comment
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev
        return [...prev, newComment]
      })
    }
  }, [candidateId])

  useSSE('recruitment:candidate:comment-added', handleSSE)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/recruitment/candidates/${candidateId}/comments`)
      if (res.ok) {
        const { data } = await res.json()
        setComments(data)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [candidateId])

  useEffect(() => { fetchComments() }, [fetchComments])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  async function handlePost() {
    if (!text.trim() || posting) return
    setPosting(true)
    try {
      const res = await fetch(`/api/recruitment/candidates/${candidateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setComments((prev) => [...prev, data])
        setText('')
      }
    } catch { /* ignore */ }
    finally { setPosting(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePost()
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">{t('loading')}</p>
  }

  return (
    <div className="flex flex-col h-[340px]">
      <div className="flex-1 overflow-y-auto space-y-3 p-1">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('empty')}</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {getInitials(c.author.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium truncate">{c.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: nl })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t pt-2 mt-2 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          className="flex-1 min-h-[36px] max-h-[80px] p-2 border rounded-md text-sm resize-none bg-background"
          maxLength={2000}
        />
        <Button
          size="icon"
          onClick={handlePost}
          disabled={!text.trim() || posting}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}
