'use client'

import { useState } from 'react'
import { VacancyForm } from '@/components/recruitment/vacancy/vacancy-form'
import { TemplateSelector, type TemplateData } from '@/components/recruitment/vacancy/template-selector'
import type { ContentBlock } from '@/lib/recruitment/types'

export function NewVacancyFlow() {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<{
    entityId?: string
    functionId?: string | null
    content?: ContentBlock[]
  } | null>(null)

  const handleTemplateSelect = (template: TemplateData | null) => {
    if (template) {
      setTemplateId(template.id)
      const clonedContent = Array.isArray(template.content)
        ? template.content.map((block: ContentBlock) => ({
            ...block,
            id: crypto.randomUUID(),
          }))
        : []
      setInitialData({
        entityId: template.entity.id,
        functionId: (template.function as { id?: string } | null)?.id ?? null,
        content: clonedContent,
      })
    } else {
      setTemplateId(null)
      setInitialData(null)
    }
    setStep('form')
  }

  if (step === 'select') {
    return <TemplateSelector onSelect={handleTemplateSelect} />
  }

  return (
    <VacancyForm
      mode="create"
      initialData={initialData ? {
        entityId: initialData.entityId ?? '',
        functionId: initialData.functionId ?? null,
      } : undefined}
      templateId={templateId}
      templateContent={initialData?.content}
    />
  )
}
