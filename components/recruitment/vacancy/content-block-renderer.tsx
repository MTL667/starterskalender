'use client'

import { Badge } from '@/components/ui/badge'
import {
  AlignLeft,
  List,
  ShieldCheck,
  Gift,
  Heart,
  Star,
  Briefcase,
  Clock,
  MapPin,
  GraduationCap,
  Smile,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ImageIcon } from 'lucide-react'
import type { ContentBlock, RequirementItem, BenefitItem, MediaContent } from '@/lib/recruitment/types'

const BENEFIT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gift: Gift,
  heart: Heart,
  star: Star,
  briefcase: Briefcase,
  clock: Clock,
  'map-pin': MapPin,
  'graduation-cap': GraduationCap,
  smile: Smile,
}

const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: AlignLeft,
  list: List,
  requirements: ShieldCheck,
  benefits: Gift,
  media: ImageIcon,
}

function TextBlockView({ content }: { content: string }) {
  if (!content) return null
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
}

function ListBlockView({ content }: { content: string[] }) {
  if (!content?.length) return null
  return (
    <ul className="list-disc list-inside space-y-1 text-sm">
      {content.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function RequirementsBlockView({ content, t }: { content: { items: RequirementItem[] }; t: ReturnType<typeof useTranslations> }) {
  const items = content?.items
  if (!items?.length) return null
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2">
          <Badge
            variant={item.tag === 'dealbreaker' ? 'destructive' : 'secondary'}
            className="text-xs shrink-0"
          >
            {t(`contentBlocks.tag_${item.tag}`)}
          </Badge>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

function BenefitsBlockView({ content }: { content: { items: BenefitItem[] } }) {
  const items = content?.items
  if (!items?.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, i) => {
        const IconComponent = BENEFIT_ICONS[item.icon] || Gift
        return (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 text-primary shrink-0">
              <IconComponent className="h-5 w-5" />
            </span>
            <span>{item.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function MediaBlockView({ content, vacancyId }: { content: MediaContent | null; vacancyId?: string }) {
  if (!content) return null
  const imageUrl = vacancyId
    ? `/api/recruitment/vacancies/${vacancyId}/photo?driveId=${encodeURIComponent(content.driveId)}&itemId=${encodeURIComponent(content.itemId)}`
    : undefined

  return imageUrl ? (
    <img
      src={imageUrl}
      alt={content.fileName}
      className="rounded-md max-w-full"
      loading="lazy"
    />
  ) : (
    <p className="text-sm text-muted-foreground">{content.fileName}</p>
  )
}

interface ContentBlockRendererProps {
  blocks: ContentBlock[]
  vacancyId?: string
}

export function ContentBlockRenderer({ blocks, vacancyId }: ContentBlockRendererProps) {
  const t = useTranslations('recruitment')

  if (!blocks?.length) return null

  const sorted = [...blocks].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {sorted.map((block) => {
        const Icon = BLOCK_ICONS[block.type] || AlignLeft
        return (
          <div key={block.id} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Icon className="h-3.5 w-3.5" />
              {t(`contentBlocks.type_${block.type}`)}
            </div>
            {block.type === 'text' && <TextBlockView content={block.content as string} />}
            {block.type === 'list' && <ListBlockView content={block.content as string[]} />}
            {block.type === 'requirements' && (
              <RequirementsBlockView content={block.content as { items: RequirementItem[] }} t={t} />
            )}
            {block.type === 'benefits' && (
              <BenefitsBlockView content={block.content as { items: BenefitItem[] }} />
            )}
            {block.type === 'media' && (
              <MediaBlockView content={block.content as MediaContent | null} vacancyId={vacancyId} />
            )}
          </div>
        )
      })}
    </div>
  )
}
