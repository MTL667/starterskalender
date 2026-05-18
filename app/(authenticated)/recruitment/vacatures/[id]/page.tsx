import { getCurrentUser } from '@/lib/auth-utils'
import { can, toAuthorizedUser, visibleEntityIds } from '@/lib/authz'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft, Pencil, MapPin, Briefcase, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  const contentBlocks = Array.isArray(vacancy.content) ? (vacancy.content as unknown as ContentBlock[]) : []

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Back link */}
      <div>
        <Link
          href="/recruitment/vacatures"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('backToVacancies')}
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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

        <div className="flex gap-2 shrink-0">
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

      {/* Vacancy info */}
      <div className="space-y-6">
        {/* Metadata card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vacancy.type && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('type')}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{typeLabels[vacancy.type] ?? vacancy.type}</dd>
                  </div>
                </div>
              )}

              {vacancy.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('location')}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{vacancy.location}</dd>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('createdAt')}</dt>
                  <dd className="mt-0.5 text-sm font-medium">
                    {new Date(vacancy.createdAt).toLocaleDateString('nl-BE')}
                  </dd>
                </div>
              </div>

              {vacancy.createdBy?.name && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('createdBy')}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{vacancy.createdBy.name}</dd>
                  </div>
                </div>
              )}
            </div>

            {vacancy.description && (
              <div className="mt-6 pt-4 border-t">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('description')}</dt>
                <dd className="text-sm whitespace-pre-wrap leading-relaxed">{vacancy.description}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content blocks */}
        {contentBlocks.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{t('contentBlocks.sectionTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ContentBlockRenderer blocks={contentBlocks} vacancyId={id} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pipeline — full width */}
      <Card>
        <CardContent className="pt-6">
          <PipelineSection
            vacancyId={id}
            stages={vacancy.stages.map((s) => ({ id: s.id, name: s.name, order: s.order, isTerminal: s.isTerminal, triggersEmail: s.triggersEmail }))}
            canWrite={canWriteCandidates}
            entityName={vacancy.entity.name}
            vacancyTitle={vacancy.title}
          />
        </CardContent>
      </Card>

      {/* Funnel */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('funnel.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart vacancyId={id} />
        </CardContent>
      </Card>
    </div>
  )
}
