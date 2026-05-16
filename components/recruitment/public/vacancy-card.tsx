import Link from 'next/link'

interface VacancyCardProps {
  id: string
  title: string
  location: string | null
  type: string | null
  entityName: string
  entityColor: string
  description: string | null
  publishedAt: string
  siteGroupSlug: string
  translations: {
    postedAgo: string
    typeLabels: Record<string, string>
  }
}

function formatPostedDays(dateStr: string): number | null {
  const ms = new Date(dateStr).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.floor((Date.now() - ms) / 86400000)
}

export function VacancyCard({
  id,
  title,
  location,
  type,
  entityName,
  entityColor,
  description,
  publishedAt,
  siteGroupSlug,
  translations,
}: VacancyCardProps) {
  const typeLabel = type ? (translations.typeLabels[type] ?? type) : null
  const days = formatPostedDays(publishedAt)

  return (
    <Link
      href={`/jobs/${siteGroupSlug}/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md motion-safe:transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg font-semibold text-gray-900 leading-snug break-words">{title}</h2>
        <span
          className="inline-flex items-center gap-1.5 shrink-0 text-xs font-medium text-gray-600"
          aria-label={entityName}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entityColor }}
            aria-hidden="true"
          />
          {entityName}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
        {location && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {location}
          </span>
        )}
        {typeLabel && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {typeLabel}
          </span>
        )}
        {days !== null && (
          <span className="text-xs text-gray-400">{translations.postedAgo}</span>
        )}
      </div>

      {description && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-2">
          {description}
        </p>
      )}
    </Link>
  )
}
