'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ListBlockProps {
  content: string[]
  editing: boolean
  onChange: (content: string[]) => void
}

export function ListBlock({ content, editing, onChange }: ListBlockProps) {
  const t = useTranslations('recruitment')
  const lastInputRef = useRef<HTMLInputElement>(null)
  const justAddedRef = useRef(false)

  useEffect(() => {
    if (justAddedRef.current && lastInputRef.current) {
      lastInputRef.current.focus()
      justAddedRef.current = false
    }
  }, [content.length])

  const items = content.length > 0 ? content : []

  if (!editing) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">{t('contentBlocks.listPlaceholder')}</p>
      )
    }
    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  }

  const updateItem = (index: number, value: string) => {
    const updated = [...items]
    updated[index] = value
    onChange(updated)
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const addItem = () => {
    justAddedRef.current = true
    onChange([...items, ''])
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">•</span>
          <Input
            ref={i === items.length - 1 ? lastInputRef : undefined}
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={t('contentBlocks.listItemPlaceholder')}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addItem()
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => removeItem(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" />
        {t('contentBlocks.addListItem')}
      </Button>
    </div>
  )
}
