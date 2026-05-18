'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface Vacancy {
  id: string
  title: string
  status: string
  entityId: string
  entity: Entity
  createdAt: string
  slaWarning?: number
  slaExceeded?: number
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'default',
  CLOSED: 'destructive',
  ARCHIVED: 'outline',
}

const ALL_VALUE = '__ALL__'

export default function VacaturesPage() {
  const t = useTranslations('recruitment')

  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState<string>(ALL_VALUE)
  const [filterStatus, setFilterStatus] = useState<string>(ALL_VALUE)

  useEffect(() => {
    Promise.all([
      fetch('/api/recruitment/vacancies').then((res) => res.json()),
      fetch('/api/entities').then((res) => res.json()),
    ])
      .then(([vacResult, entResult]) => {
        setVacancies(vacResult.data ?? [])
        setEntities(Array.isArray(entResult) ? entResult : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return vacancies.filter((v) => {
      if (filterEntity !== ALL_VALUE && v.entityId !== filterEntity) return false
      if (filterStatus !== ALL_VALUE && v.status !== filterStatus) return false
      return true
    })
  }, [vacancies, filterEntity, filterStatus])

  const statusLabel = (status: string) => {
    const key = `status${status.charAt(0) + status.slice(1).toLowerCase()}` as
      | 'statusDraft'
      | 'statusPublished'
      | 'statusClosed'
      | 'statusArchived'
    return t(key)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-4 w-72 bg-muted rounded" />
            </div>
            <div className="h-10 w-40 bg-muted rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-48 bg-muted rounded" />
            <div className="h-10 w-48 bg-muted rounded" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('vacancies')}</h1>
          <p className="text-muted-foreground">{t('vacanciesDescription')}</p>
        </div>
        <Link href="/recruitment/vacatures/nieuw">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('newVacancy')}
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('filterEntity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('filterAll')}</SelectItem>
            {entities.map((entity) => (
              <SelectItem key={entity.id} value={entity.id}>
                {entity.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('filterAll')}</SelectItem>
            <SelectItem value="DRAFT">{t('statusDraft')}</SelectItem>
            <SelectItem value="PUBLISHED">{t('statusPublished')}</SelectItem>
            <SelectItem value="CLOSED">{t('statusClosed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground mb-4">{t('noVacancies')}</p>
          <Link href="/recruitment/vacatures/nieuw">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('newVacancy')}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('fieldTitle')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('fieldEntity')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('filterStatus')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('createdAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((vacancy) => (
                  <tr key={vacancy.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/recruitment/vacatures/${vacancy.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {vacancy.title}
                        </Link>
                        {(vacancy.slaExceeded ?? 0) > 0 && (
                          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-1.5 py-0.5 font-medium">
                            {vacancy.slaExceeded}
                          </span>
                        )}
                        {(vacancy.slaWarning ?? 0) > 0 && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 font-medium">
                            {vacancy.slaWarning}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" style={{ borderColor: vacancy.entity.colorHex, color: vacancy.entity.colorHex }}>{vacancy.entity.name}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[vacancy.status] ?? 'secondary'}>
                        {statusLabel(vacancy.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(vacancy.createdAt).toLocaleDateString('nl-BE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filtered.map((vacancy) => (
              <Link
                key={vacancy.id}
                href={`/recruitment/vacatures/${vacancy.id}`}
                className="block rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{vacancy.title}</span>
                    {(vacancy.slaExceeded ?? 0) > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-1.5 py-0.5 font-medium">
                        {vacancy.slaExceeded}
                      </span>
                    )}
                    {(vacancy.slaWarning ?? 0) > 0 && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 font-medium">
                        {vacancy.slaWarning}
                      </span>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[vacancy.status] ?? 'secondary'} className="ml-2 shrink-0">
                    {statusLabel(vacancy.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs" style={{ borderColor: vacancy.entity.colorHex, color: vacancy.entity.colorHex }}>{vacancy.entity.name}</Badge>
                  <span>{new Date(vacancy.createdAt).toLocaleDateString('nl-BE')}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
