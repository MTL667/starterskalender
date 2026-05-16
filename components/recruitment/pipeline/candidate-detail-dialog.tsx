'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { User, Mail, Phone, Calendar, Shield, ArrowRight, Download, FileText, Loader2, AlertTriangle, CheckCircle2, Share2 } from 'lucide-react'
import { type PipelineCandidateItem } from './candidate-card'
import { ScoreRing } from './score-ring'
import { ShareDialog } from '@/components/recruitment/share/share-dialog'
import { SharesTab } from '@/components/recruitment/share/shares-tab'
import { AuditTrail } from '@/components/recruitment/share/audit-trail'
import { CommentsTab } from './comments-tab'
import { EmailsTab } from './emails-tab'

interface CandidateApplication {
  id: string
  cvDriveId: string | null
  cvItemId: string | null
  cvFileName: string | null
  motivation: string | null
  appliedAt: string
}

interface TimelineEntry {
  id: string
  action: string
  meta: Record<string, any> | null
  createdAt: string
  actor: { id: string; name: string } | null
}

interface CandidateDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  source: string
  status: string
  dealbreakersResult: string
  niceToHaveScore: number | null
  verifiedAt: string | null
  starterId: string | null
  createdAt: string
  vacancy: {
    id: string
    title: string
    entityId: string
    entity: { id: string; name: string; colorHex: string }
  }
  stage: { id: string; name: string; order: number }
  createdBy: { id: string; name: string } | null
  application: CandidateApplication | null
  timeline: TimelineEntry[]
}

interface CandidateDetailDialogProps {
  candidate: PipelineCandidateItem | null
  entityName: string
  onClose: () => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function CandidateDetailDialog({
  candidate,
  entityName,
  onClose,
}: CandidateDetailDialogProps) {
  const t = useTranslations('recruitment')
  const [detail, setDetail] = useState<CandidateDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!candidate) {
      setDetail(null)
      setError(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const candidateId = candidate.id

    setLoading(true)
    setError(false)

    fetch(`/api/recruitment/candidates/${candidateId}`, { signal: controller.signal })
      .then(async (res) => {
        if (controller.signal.aborted) return
        if (!res.ok) { setError(true); return }
        const json = await res.json()
        if (controller.signal.aborted) return
        if (!json?.data) { setError(true); return }
        setDetail(json.data)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [candidate])

  if (!candidate) return null

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim() || candidate.email

  return (
    <Dialog open={!!candidate} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-semibold shrink-0"
              style={{ backgroundColor: detail?.vacancy.entity.colorHex ?? '#6b7280' }}
            >
              {(candidate.firstName || candidate.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg">{fullName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{entityName}</Badge>
                <Badge variant="secondary" className="text-xs">{candidate.stage.name}</Badge>
                <Badge variant="outline" className="text-xs">
                  {safeSourceLabel(t, candidate.source)}
                </Badge>
                <ScoreRing score={candidate.niceToHaveScore} size="sm" />
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              {t('share.title')}
            </Button>
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t('profile.loading')}</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-sm text-destructive">{t('profile.errorLoading')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                abortRef.current?.abort()
                const controller = new AbortController()
                abortRef.current = controller
                setLoading(true)
                setError(false)
                fetch(`/api/recruitment/candidates/${candidate.id}`, { signal: controller.signal })
                  .then(async (res) => {
                    if (controller.signal.aborted) return
                    if (!res.ok) { setError(true); return }
                    const json = await res.json()
                    if (controller.signal.aborted) return
                    if (!json?.data) { setError(true); return }
                    setDetail(json.data)
                  })
                  .catch((err) => {
                    if (err?.name === 'AbortError') return
                    setError(true)
                  })
                  .finally(() => {
                    if (!controller.signal.aborted) setLoading(false)
                  })
              }}
            >
              {t('profile.retry')}
            </Button>
          </div>
        )}

        {detail && !loading && detail.starterId && (
          <a
            href={`/starters?highlight=${detail.starterId}`}
            className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors mt-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t('hire.hiredBanner')}
            <ArrowRight className="h-3 w-3 ml-auto" />
          </a>
        )}

        {detail && !loading && (
          <Tabs defaultValue="overview" className="mt-2">
            <TabsList className="w-full justify-start h-11">
              <TabsTrigger value="overview" className="min-h-[44px]">{t('profile.tabOverview')}</TabsTrigger>
              <TabsTrigger value="cv" className="min-h-[44px]">{t('profile.tabCv')}</TabsTrigger>
              <TabsTrigger value="motivation" className="min-h-[44px]">{t('profile.tabMotivation')}</TabsTrigger>
              <TabsTrigger value="timeline" className="min-h-[44px]">{t('profile.tabTimeline')}</TabsTrigger>
              <TabsTrigger value="comments" className="min-h-[44px]">{t('comments.tab')}</TabsTrigger>
              <TabsTrigger value="emails" className="min-h-[44px]">{t('emails.tab')}</TabsTrigger>
              <TabsTrigger value="shares" className="min-h-[44px]">{t('share.sharesTab')}</TabsTrigger>
              <TabsTrigger value="history" className="min-h-[44px]">{t('audit.historyTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-2">
              <OverviewTab detail={detail} t={t} />
            </TabsContent>

            <TabsContent value="cv" className="pt-2">
              <CvTab detail={detail} t={t} />
            </TabsContent>

            <TabsContent value="motivation" className="pt-2">
              <MotivationTab detail={detail} t={t} />
            </TabsContent>

            <TabsContent value="timeline" className="pt-2">
              <TimelineTab detail={detail} t={t} />
            </TabsContent>

            <TabsContent value="comments" className="pt-2">
              <CommentsTab candidateId={detail.id} />
            </TabsContent>

            <TabsContent value="emails" className="pt-2">
              <EmailsTab candidateId={detail.id} />
            </TabsContent>

            <TabsContent value="shares" className="pt-2">
              <SharesTab candidateId={detail.id} />
            </TabsContent>

            <TabsContent value="history" className="pt-2">
              <AuditTrail candidateId={detail.id} />
            </TabsContent>
          </Tabs>
        )}

        <div className="border-t pt-3 mt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            {t('profile.processingBasis')}
          </p>
        </div>
      </DialogContent>

      {candidate && (
        <ShareDialog
          candidateId={candidate.id}
          candidateName={`${candidate.firstName} ${candidate.lastName}`.trim() || candidate.email}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </Dialog>
  )
}

function EvaluationsSection({ candidateId, t }: { candidateId: string; t: any }) {
  const [data, setData] = useState<{
    aggregate: { overallAverage: number | null; reviewCount: number; criteria: { criterionId: string; name: string; average: number | null; reviews: { evaluatorName: string; score: number; comment: string | null }[] }[] }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`/api/recruitment/candidates/${candidateId}/evaluations`)
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json()
          setData(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [candidateId])

  if (loading) {
    return (
      <div className="border-t pt-3">
        <div className="animate-pulse h-4 w-32 bg-muted rounded" />
      </div>
    )
  }

  if (!data || data.aggregate.reviewCount === 0) {
    return (
      <div className="border-t pt-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('evaluations.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('evaluations.noEvaluations')}</p>
      </div>
    )
  }

  const { aggregate } = data

  return (
    <div className="border-t pt-3 space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{t('evaluations.title')}</h3>
        <ScoreRing score={aggregate.overallAverage} size="lg" />
        <span className="text-lg font-bold">{aggregate.overallAverage?.toFixed(1) ?? '–'}</span>
        <span className="text-xs text-muted-foreground">{t('evaluations.reviewCount', { count: aggregate.reviewCount })}</span>
      </div>

      <div className="space-y-2">
        {aggregate.criteria.map((criterion) => (
          <div key={criterion.criterionId} className="rounded-md border p-2">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left"
              onClick={() => setExpanded((prev) => ({ ...prev, [criterion.criterionId]: !prev[criterion.criterionId] }))}
            >
              <span className="text-sm font-medium">{criterion.name}</span>
              <div className="flex items-center gap-2">
                <ScoreRing score={criterion.average} size="sm" />
                <ArrowRight className={`h-3 w-3 text-muted-foreground transition-transform ${expanded[criterion.criterionId] ? 'rotate-90' : ''}`} />
              </div>
            </button>
            {expanded[criterion.criterionId] && criterion.reviews.length > 0 && (
              <div className="mt-2 pl-2 space-y-1.5 border-l-2 border-muted ml-1">
                {criterion.reviews.map((review, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="font-medium">{review.evaluatorName}:</span>{' '}
                    <span className="text-muted-foreground">{review.score}/5</span>
                    {review.comment && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OverviewTab({ detail, t }: { detail: CandidateDetail; t: any }) {
  const appliedDate = detail.application?.appliedAt ?? detail.createdAt

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('profile.personalData')}</h3>
        <div className="space-y-2">
          <InfoRow icon={<User className="h-4 w-4" />} label={detail.firstName + ' ' + detail.lastName} />
          <InfoRow icon={<Mail className="h-4 w-4" />} label={detail.email} />
          {detail.phone && (
            <InfoRow icon={<Phone className="h-4 w-4" />} label={detail.phone} />
          )}
        </div>
      </div>

      <div className="border-t pt-3 grid grid-cols-2 gap-3">
        <MetaField label={t('profile.source')} value={safeSourceLabel(t, detail.source)} />
        <MetaField label={t('profile.stage')} value={detail.stage.name} />
        <MetaField label={t('profile.appliedAt')} value={formatShortDate(appliedDate)} />
        <MetaField
          label={t('profile.verifiedAt')}
          value={
            detail.verifiedAt
              ? formatShortDate(detail.verifiedAt)
              : detail.status === 'PENDING_VERIFICATION'
                ? t('profile.pendingVerification')
                : '—'
          }
          icon={
            detail.verifiedAt
              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              : detail.status === 'PENDING_VERIFICATION'
                ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                : undefined
          }
        />
      </div>

      {detail.application?.cvFileName && (
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">CV:</span>
            <span className="font-medium truncate">{detail.application.cvFileName}</span>
          </div>
        </div>
      )}

      <EvaluationsSection candidateId={detail.id} t={t} />

      <div className="border-t pt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await fetch(`/api/recruitment/candidates/${detail.id}/export`, { method: 'POST' })
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          {t('profile.exportData')}
        </Button>
      </div>
    </div>
  )
}

function CvTab({ detail, t }: { detail: CandidateDetail; t: any }) {
  const app = detail.application
  const [iframeError, setIframeError] = useState(false)

  if (!app?.cvDriveId || !app?.cvItemId) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        {t('profile.noCv')}
      </div>
    )
  }

  const docUrl = `/api/recruitment/candidates/${detail.id}/documents`
  const isPdf = app.cvFileName?.toLowerCase().endsWith('.pdf')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate">{app.cvFileName}</span>
        <Button variant="outline" className="min-h-[44px]" asChild>
          <a href={docUrl} download={app.cvFileName ?? 'cv'}>
            <Download className="h-4 w-4 mr-1.5" />
            {t('profile.downloadCv')}
          </a>
        </Button>
      </div>
      {isPdf && !iframeError && (
        <iframe
          src={docUrl}
          className="w-full rounded-md border"
          style={{ height: '500px' }}
          title={app.cvFileName ?? 'CV'}
          onError={() => setIframeError(true)}
        />
      )}
      {isPdf && iframeError && (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-md">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
          <p>{t('profile.cvPreviewFailed')}</p>
          <Button variant="outline" className="mt-3 min-h-[44px]" asChild>
            <a href={docUrl} download={app.cvFileName ?? 'cv'}>
              <Download className="h-4 w-4 mr-1.5" />
              {t('profile.downloadCv')}
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}

function MotivationTab({ detail, t }: { detail: CandidateDetail; t: any }) {
  const motivation = detail.application?.motivation

  if (!motivation) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        {t('profile.noMotivation')}
      </div>
    )
  }

  return (
    <div className="prose prose-sm max-w-none">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{motivation}</p>
    </div>
  )
}

function TimelineTab({ detail, t }: { detail: CandidateDetail; t: any }) {
  const entries = detail.timeline

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        {t('profile.timelineEmpty')}
      </div>
    )
  }

  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      {entries.map((entry) => (
        <TimelineEntry key={entry.id} entry={entry} t={t} />
      ))}
      <div className="relative">
        <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-primary" />
        <div className="text-sm">
          <span className="text-muted-foreground">{t('profile.timelineCreated')}</span>
          <span className="block text-xs text-muted-foreground/70 mt-0.5">
            {formatDate(detail.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

function TimelineEntry({ entry, t }: { entry: TimelineEntry; t: any }) {
  const meta = entry.meta as Record<string, string> | null
  const actorName = entry.actor?.name ?? '—'

  let description: string
  if (entry.action === 'CANDIDATE_STAGE_MOVE' && meta) {
    const toStage = meta.toStageName ?? meta.toStageId ?? '?'
    description = t('profile.timelineMoved', { actor: actorName, stage: toStage })
  } else {
    description = `${actorName}: ${entry.action}`
  }

  return (
    <div className="relative">
      <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-muted-foreground/40" />
      <div className="text-sm">
        {entry.action === 'CANDIDATE_STAGE_MOVE' && meta && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
            <span>{meta.fromStageName ?? meta.fromStageId}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">{meta.toStageName ?? meta.toStageId}</span>
          </div>
        )}
        <span className="text-muted-foreground">{description}</span>
        <span className="block text-xs text-muted-foreground/70 mt-0.5">
          {formatDate(entry.createdAt)}
        </span>
      </div>
    </div>
  )
}

const SOURCE_KEYS = ['direct', 'referral', 'linkedin', 'other', 'application'] as const

function safeSourceLabel(t: any, source: string): string {
  const key = source.toLowerCase()
  if ((SOURCE_KEYS as readonly string[]).includes(key)) {
    return t(`candidate.source_${key}`)
  }
  return source
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function MetaField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5 flex items-center gap-1">
        {icon}
        {value}
      </dd>
    </div>
  )
}
