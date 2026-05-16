import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser, visibleEntityIds } from '@/lib/authz'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VacancyDeleteButton } from '@/components/recruitment/vacancy/vacancy-delete-button'
import { QrCodeButton } from '@/components/recruitment/vacancy/qr-code-button'
import { ContentBlockRenderer } from '@/components/recruitment/vacancy/content-block-renderer'
import { PipelineSection } from '@/components/recruitment/pipeline/pipeline-section'
import { FunnelChart } from '@/components/recruitment/dashboard/funnel-chart'
import type { ContentBlock } from '@/lib/recruitment/types'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'default',
  CLOSED: 'destructive',
  ARCHIVED: 'outline',
}

export default async function VacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'recruitment:read')) {
    redirect('/dashboard')
  }

  const vacancy = await prisma.vacancy.findUnique({
    where: { id, deletedAt: null },
    include: {
      entity: true,
      function: true,
      createdBy: { select: { id: true, name: true, email: true } },
      stages: { orderBy: { order: 'asc' } },
    },
  })

  if (!vacancy) {
    notFound()
  }

  const entityScope = visibleEntityIds(authUser, 'recruitment:read')
  if (entityScope !== 'ALL' && !entityScope.includes(vacancy.entityId)) {
    notFound()
  }

  const t = await getTranslations('recruitment')
  const canEdit = can(authUser, 'vacancy:edit', { entityId: vacancy.entityId })
  const canDelete = can(authUser, 'vacancy:delete', { entityId: vacancy.entityId })
  const canWriteCandidates = can(authUser, 'candidate:write', { entityId: vacancy.entityId })

  const statusKey = `status${vacancy.status.charAt(0) + vacancy.status.slice(1).toLowerCase()}` as
    | 'statusDraft'
    | 'statusPublished'
    | 'statusClosed'
    | 'statusArchived'

  const typeLabels: Record<string, string> = {
    fulltime: t('typeFulltime'),
    parttime: t('typeParttime'),
    interim: t('typeInterim'),
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/recruitment/vacatures"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('backToVacancies')}
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{vacancy.title}</h1>
            <Badge variant={STATUS_VARIANT[vacancy.status] ?? 'secondary'}>
              {t(statusKey)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Badge variant="outline">{vacancy.entity.name}</Badge>
            {vacancy.function && (
              <span className="text-sm">{vacancy.function.title}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <QrCodeButton vacancyId={vacancy.id} isPublished={vacancy.status === 'PUBLISHED'} />
          {canEdit && (
            <Link href={`/recruitment/vacatures/${vacancy.id}/bewerken`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                {t('editVacancy')}
              </Button>
            </Link>
          )}
          {canDelete && (
            <VacancyDeleteButton vacancyId={vacancy.id} status={vacancy.status} />
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          {vacancy.type && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('type')}</dt>
              <dd className="mt-1">{typeLabels[vacancy.type] ?? vacancy.type}</dd>
            </div>
          )}

          {vacancy.location && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('location')}</dt>
              <dd className="mt-1">{vacancy.location}</dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-muted-foreground">{t('description')}</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {vacancy.description || <span className="text-muted-foreground italic">{t('noDescription')}</span>}
            </dd>
          </div>

          <div className="pt-4 border-t flex gap-6 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">{t('createdAt')}:</span>{' '}
              {new Date(vacancy.createdAt).toLocaleDateString('nl-BE')}
            </div>
            {vacancy.createdBy?.name && (
              <div>
                <span className="font-medium">{t('createdBy')}:</span>{' '}
                {vacancy.createdBy.name}
              </div>
            )}
          </div>
        </div>

        {(() => {
          const contentBlocks = Array.isArray(vacancy.content) ? (vacancy.content as unknown as ContentBlock[]) : []
          if (contentBlocks.length === 0) return null
          return (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">{t('contentBlocks.sectionTitle')}</h2>
              <ContentBlockRenderer blocks={contentBlocks} vacancyId={id} />
            </div>
          )
        })()}

        <PipelineSection
          vacancyId={id}
          stages={vacancy.stages.map((s) => ({ id: s.id, name: s.name, order: s.order, isTerminal: s.isTerminal, triggersEmail: s.triggersEmail }))}
          canWrite={canWriteCandidates}
          entityName={vacancy.entity.name}
          vacancyTitle={vacancy.title}
        />

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">{t('funnel.title')}</h2>
          <FunnelChart vacancyId={id} />
        </div>
      </div>
    </div>
  )
}
