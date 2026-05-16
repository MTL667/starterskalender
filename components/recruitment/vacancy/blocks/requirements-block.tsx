'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { RequirementItem } from '@/lib/recruitment/types'

interface RequirementsBlockProps {
  content: { items: RequirementItem[] }
  editing: boolean
  onChange: (content: { items: RequirementItem[] }) => void
}

export function RequirementsBlock({ content, editing, onChange }: RequirementsBlockProps) {
  const t = useTranslations('recruitment')
  const lastInputRef = useRef<HTMLInputElement>(null)
  const justAddedRef = useRef(false)

  const items = content?.items ?? []

  useEffect(() => {
    if (justAddedRef.current && lastInputRef.current) {
      lastInputRef.current.focus()
      justAddedRef.current = false
    }
  }, [items.length])

  if (!editing) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">{t('contentBlocks.requirementsPlaceholder')}</p>
      )
    }
    return (
      <ul className="space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <Badge variant={item.tag === 'dealbreaker' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
              {t(`contentBlocks.tag_${item.tag}`)}
            </Badge>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    )
  }

  const updateItem = (index: number, field: keyof RequirementItem, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ items: updated })
  }

  const toggleTag = (index: number) => {
    const updated = [...items]
    updated[index] = {
      ...updated[index],
      tag: updated[index].tag === 'dealbreaker' ? 'nice-to-have' : 'dealbreaker',
    }
    onChange({ items: updated })
  }

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  const addItem = () => {
    justAddedRef.current = true
    onChange({ items: [...items, { text: '', tag: 'nice-to-have' }] })
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleTag(i)}
            className="shrink-0"
            title={t('contentBlocks.toggleTag')}
          >
            <Badge
              variant={item.tag === 'dealbreaker' ? 'destructive' : 'secondary'}
              className="text-xs cursor-pointer hover:opacity-80"
            >
              {t(`contentBlocks.tag_${item.tag}`)}
            </Badge>
          </button>
          <Input
            ref={i === items.length - 1 ? lastInputRef : undefined}
            value={item.text}
            onChange={(e) => updateItem(i, 'text', e.target.value)}
            placeholder={t('contentBlocks.requirementItemPlaceholder')}
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
        {t('contentBlocks.addRequirement')}
      </Button>
    </div>
  )
}
