'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus } from 'lucide-react'

import type { ContentBlock } from '@/lib/recruitment/types'

export interface TemplateData {
  id: string
  name: string
  entity: { id: string; name: string }
  function?: { id?: string; title: string } | null
  content: ContentBlock[]
  stages: unknown[]
  usageCount: number
}

interface TemplateSelectorProps {
  onSelect: (template: TemplateData | null) => void
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const t = useTranslations('recruitment')
  const [templates, setTemplates] = useState<TemplateData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/recruitment/templates')
      .then(async (res) => {
        if (!res.ok) {
          setError(true)
          return
        }
        const result = await res.json()
        setTemplates(result.data ?? [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">{t('templates.selectTitle')}</h1>
      <p className="text-muted-foreground mb-6">{t('templates.selectDescription')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Blank vacancy option */}
        <button
          onClick={() => onSelect(null)}
          className="rounded-lg border-2 border-dashed p-6 text-left hover:border-primary hover:bg-accent/50 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-full bg-muted p-2 group-hover:bg-primary/10">
              <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="font-semibold">{t('templates.blankVacancy')}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('templates.blankVacancyDescription')}
          </p>
        </button>

        {/* Template cards */}
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl)}
            className="rounded-lg border p-6 text-left hover:border-primary hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-muted p-2 group-hover:bg-primary/10">
                <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="font-semibold">{tpl.name}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{tpl.entity.name}</Badge>
              {tpl.function && (
                <Badge variant="secondary" className="text-xs">{tpl.function.title}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('templates.usageCount', { count: tpl.usageCount })}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive mt-4">{t('templates.loadError')}</p>
      )}

      {!error && templates.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4">{t('templates.noTemplatesAvailable')}</p>
      )}
    </div>
  )
}
