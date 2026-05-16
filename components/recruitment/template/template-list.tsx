'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

interface Template {
  id: string
  name: string
  entity: { name: string }
  function?: { title: string } | null
  usageCount: number
  createdAt: string
}

export function TemplateList() {
  const t = useTranslations('recruitment')
  const [templates, setTemplates] = useState<Template[]>([])
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
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/recruitment/admin/templates/nieuw">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('templates.newTemplate')}
          </Button>
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive p-8 text-center text-destructive">
          <p>{t('templates.loadError')}</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>{t('templates.noTemplates')}</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium">{t('templates.columnName')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('templates.columnEntity')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('templates.columnFunction')}</th>
                <th className="text-right p-3 text-sm font-medium">{t('templates.columnUsage')}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {tpl.name}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{tpl.entity.name}</Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {tpl.function?.title ?? '—'}
                  </td>
                  <td className="p-3 text-right text-sm text-muted-foreground">
                    {tpl.usageCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
