'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Users } from 'lucide-react'
import { AddCandidateDialog } from './add-candidate-dialog'

interface CandidateItem {
  id: string
  firstName: string
  lastName: string
  email: string
  source: string
  stage: { id: string; name: string; order: number }
  dealbreakersResult: string
  createdAt: string
}

interface CandidateListSectionProps {
  vacancyId: string
  canWrite: boolean
}

export function CandidateListSection({ vacancyId, canWrite }: CandidateListSectionProps) {
  const t = useTranslations('recruitment')
  const [candidates, setCandidates] = useState<CandidateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCandidates = useCallback(async () => {
    try {
      setFetchError(false)
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}/candidates`)
      if (res.ok) {
        const result = await res.json()
        setCandidates(Array.isArray(result.data) ? result.data : [])
      } else {
        setFetchError(true)
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [vacancyId])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const handleSuccess = () => {
    fetchCandidates()
    setSuccessMessage(t('candidate.addedSuccess'))
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setSuccessMessage(null), 4000)
  }

  const sourceLabel = (source: string) => {
    const key = `candidate.source_${source.toLowerCase()}`
    return t(key as any)
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('candidate.sectionTitle')}</h2>
          <Badge variant="outline" className="ml-1">{candidates.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {successMessage && (
            <span className="text-sm text-green-600">{successMessage}</span>
          )}
          {canWrite && (
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              {t('candidate.addButton')}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm text-destructive">{t('candidate.errorGeneric')}</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('candidate.emptyState')}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium">{t('candidate.columnName')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('candidate.columnEmail')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('candidate.columnSource')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('candidate.columnStage')}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.firstName} {c.lastName}</td>
                  <td className="p-3 text-sm text-muted-foreground">{c.email}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{sourceLabel(c.source)}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="text-xs">{c.stage.name}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <AddCandidateDialog
          vacancyId={vacancyId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
