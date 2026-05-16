'use client'

import { useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'

interface TextBlockProps {
  content: string
  editing: boolean
  onChange: (content: string) => void
}

export function TextBlock({ content, editing, onChange }: TextBlockProps) {
  const t = useTranslations('recruitment')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  if (!editing) {
    return (
      <div className="whitespace-pre-wrap text-sm text-foreground min-h-[2rem]">
        {content || <span className="text-muted-foreground italic">{t('contentBlocks.textPlaceholder')}</span>}
      </div>
    )
  }

  return (
    <Textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t('contentBlocks.textPlaceholder')}
      className="min-h-[6rem] resize-y"
    />
  )
}
