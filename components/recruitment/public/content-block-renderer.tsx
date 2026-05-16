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
  ImageIcon,
} from 'lucide-react'
import type { ContentBlock, RequirementItem, BenefitItem, MediaContent } from '@/lib/recruitment/types'

interface ContentBlockRendererProps {
  blocks: ContentBlock[]
  vacancyId: string
  translations: {
    dealbreaker: string
    niceToHave: string
    blockLabels: Record<string, string>
  }
}

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

function TextBlock({ content }: { content: unknown }) {
  if (typeof content !== 'string' || !content) return null
  return <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-700">{content}</p>
}

function ListBlock({ content }: { content: unknown }) {
  if (!Array.isArray(content) || content.length === 0) return null
  return (
    <ul className="list-disc list-inside space-y-2 text-base text-gray-700">
      {content.filter((item): item is string => typeof item === 'string' && item.length > 0).map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function RequirementsBlock({
  content,
  translations,
}: {
  content: unknown
  translations: { dealbreaker: string; niceToHave: string }
}) {
  const raw = content as { items?: unknown } | null
  const items = Array.isArray(raw?.items) ? (raw.items as RequirementItem[]) : []
  const valid = items.filter((item) => typeof item?.text === 'string' && item.text.length > 0)
  if (valid.length === 0) return null
  return (
    <ul className="space-y-3">
      {valid.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 ${
              item.tag === 'dealbreaker'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {item.tag === 'dealbreaker' ? translations.dealbreaker : translations.niceToHave}
          </span>
          <span className="text-base text-gray-700">{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

function BenefitsBlock({ content }: { content: unknown }) {
  const raw = content as { items?: unknown } | null
  const items = Array.isArray(raw?.items) ? (raw.items as BenefitItem[]) : []
  const valid = items.filter((item) => typeof item?.text === 'string' && item.text.length > 0)
  if (valid.length === 0) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {valid.map((item, i) => {
        const IconComponent = BENEFIT_ICONS[item.icon] || Gift
        return (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-0.5 text-emerald-600 shrink-0">
              <IconComponent className="h-5 w-5" />
            </span>
            <span className="text-base text-gray-700">{item.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function MediaBlock({ content, vacancyId }: { content: unknown; vacancyId: string }) {
  const media = content as MediaContent | null
  if (!media?.driveId || !media?.itemId) return null
  const imageUrl = `/api/public/vacancies/${vacancyId}/photo?driveId=${encodeURIComponent(media.driveId)}&itemId=${encodeURIComponent(media.itemId)}`

  return (
    <img
      src={imageUrl}
      alt={media.fileName ?? ''}
      className="rounded-lg max-w-full"
      loading="lazy"
    />
  )
}

export function ContentBlockRenderer({ blocks, vacancyId, translations }: ContentBlockRendererProps) {
  if (!blocks?.length) return null

  const KNOWN_TYPES = new Set(['text', 'list', 'requirements', 'benefits', 'media'])
  const sorted = [...blocks]
    .filter((b) => KNOWN_TYPES.has(b.type))
    .sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-8">
      {sorted.map((block) => {
        const Icon = BLOCK_ICONS[block.type] || AlignLeft
        const label = translations.blockLabels[block.type]
        return (
          <section key={block.id} className="bg-white rounded-xl border border-gray-200 p-6">
            {label && (
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
                <Icon className="h-4 w-4" />
                {label}
              </div>
            )}
            {block.type === 'text' && <TextBlock content={block.content} />}
            {block.type === 'list' && <ListBlock content={block.content} />}
            {block.type === 'requirements' && (
              <RequirementsBlock content={block.content} translations={translations} />
            )}
            {block.type === 'benefits' && (
              <BenefitsBlock content={block.content} />
            )}
            {block.type === 'media' && (
              <MediaBlock content={block.content} vacancyId={vacancyId} />
            )}
          </section>
        )
      })}
    </div>
  )
}
