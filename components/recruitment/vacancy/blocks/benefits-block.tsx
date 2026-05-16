'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X, Gift, Heart, Star, Briefcase, Clock, MapPin, GraduationCap, Smile } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTranslations } from 'next-intl'
import type { BenefitItem } from '@/lib/recruitment/types'

const BENEFIT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gift: Gift,
  heart: Heart,
  star: Star,
  briefcase: Briefcase,
  clock: Clock,
  'map-pin': MapPin,
  'graduation-cap': GraduationCap,
  smile: Smile,
}

const ICON_OPTIONS = Object.keys(BENEFIT_ICONS)

interface BenefitsBlockProps {
  content: { items: BenefitItem[] }
  editing: boolean
  onChange: (content: { items: BenefitItem[] }) => void
}

export function BenefitsBlock({ content, editing, onChange }: BenefitsBlockProps) {
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

  const renderIcon = (iconName: string, className = 'h-4 w-4') => {
    const IconComponent = BENEFIT_ICONS[iconName] || Gift
    return <IconComponent className={className} />
  }

  if (!editing) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">{t('contentBlocks.benefitsPlaceholder')}</p>
      )
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 text-primary shrink-0">{renderIcon(item.icon, 'h-5 w-5')}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    )
  }

  const updateItem = (index: number, field: keyof BenefitItem, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange({ items: updated })
  }

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  const addItem = () => {
    justAddedRef.current = true
    onChange({ items: [...items, { icon: 'gift', text: '' }] })
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0">
                {renderIcon(item.icon)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-4 gap-1">
                {ICON_OPTIONS.map((iconName) => (
                  <Button
                    key={iconName}
                    type="button"
                    variant={item.icon === iconName ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateItem(i, 'icon', iconName)}
                  >
                    {renderIcon(iconName)}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            ref={i === items.length - 1 ? lastInputRef : undefined}
            value={item.text}
            onChange={(e) => updateItem(i, 'text', e.target.value)}
            placeholder={t('contentBlocks.benefitItemPlaceholder')}
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
        {t('contentBlocks.addBenefit')}
      </Button>
    </div>
  )
}
