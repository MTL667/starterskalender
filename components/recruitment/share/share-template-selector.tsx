'use client'

import { useTranslations } from 'next-intl'
import { DEFAULT_SHARE_TEMPLATES } from '@/lib/recruitment/share-templates'
import { cn } from '@/lib/utils'

interface TemplateOption {
  id: string
  name: string
  description: string | null
  visibleFields: string[]
}

interface ShareTemplateSelectorProps {
  selected: string
  onSelect: (templateId: string, fields: string[]) => void
  adminTemplates?: TemplateOption[]
}

export function ShareTemplateSelector({ selected, onSelect, adminTemplates }: ShareTemplateSelectorProps) {
  const t = useTranslations('recruitment.share')

  const baseTemplates = adminTemplates && adminTemplates.length > 0
    ? adminTemplates.map((tmpl) => ({
        id: tmpl.id,
        name: tmpl.name,
        description: tmpl.description ?? '',
        fields: tmpl.visibleFields,
      }))
    : DEFAULT_SHARE_TEMPLATES.map((tmpl) => ({
        id: tmpl.id,
        name: tmpl.id === 'technical-review' ? t('templateTechnical') : t('templateHR'),
        description: tmpl.id === 'technical-review' ? t('templateTechnicalDesc') : t('templateHRDesc'),
        fields: tmpl.visibleFields,
      }))

  const templates = [
    ...baseTemplates,
    {
      id: 'custom',
      name: t('templateCustom'),
      description: t('templateCustomDesc'),
      fields: [] as string[],
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {templates.map((tmpl) => (
        <button
          key={tmpl.id}
          type="button"
          onClick={() => onSelect(tmpl.id, tmpl.fields)}
          className={cn(
            'rounded-lg border p-3 text-left transition-colors text-sm',
            selected === tmpl.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
          )}
        >
          <div className="font-medium text-sm">{tmpl.name}</div>
          <div className="text-xs text-muted-foreground mt-1">{tmpl.description}</div>
        </button>
      ))}
    </div>
  )
}
