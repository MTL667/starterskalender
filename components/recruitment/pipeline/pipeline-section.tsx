'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { PipelineKanban } from './pipeline-kanban'
import { AddCandidateDialog } from '../candidate/add-candidate-dialog'

interface Stage {
  id: string
  name: string
  order: number
  isTerminal: boolean
  triggersEmail?: boolean
}

interface PipelineSectionProps {
  vacancyId: string
  stages: Stage[]
  canWrite: boolean
  entityName: string
  vacancyTitle?: string
}

export function PipelineSection({ vacancyId, stages, canWrite, entityName, vacancyTitle }: PipelineSectionProps) {
  const t = useTranslations('recruitment')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAddSuccess = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div>
      <a
        href="#pipeline-board"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        {t('pipeline.skipLink')}
      </a>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('pipeline.sectionTitle')}</h2>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            {t('candidate.addButton')}
          </Button>
        )}
      </div>

      <PipelineKanban
        key={refreshKey}
        vacancyId={vacancyId}
        stages={stages}
        canWrite={canWrite}
        entityName={entityName}
        vacancyTitle={vacancyTitle}
        onAddCandidate={() => setDialogOpen(true)}
      />

      {canWrite && (
        <AddCandidateDialog
          vacancyId={vacancyId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  )
}
