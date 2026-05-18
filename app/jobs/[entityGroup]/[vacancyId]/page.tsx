import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { ContentBlockRenderer } from '@/components/recruitment/public/content-block-renderer'
import type { ContentBlock } from '@/lib/recruitment/types'

export const revalidate = 3600

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  fulltime: 'FULL_TIME',
  parttime: 'PART_TIME',
  interim: 'TEMPORARY',
  freelance: 'CONTRACTOR',
}

interface PageProps {
  params: Promise<{ entityGroup: string; vacancyId: string }>
}

const getVacancyData = cache(async (entityGroup: string, vacancyId: string) => {
  const siteGroup = await prisma.siteGroup.findUnique({
    where: { slug: entityGroup },
    select: { id: true, name: true, entities: { select: { id: true, name: true, colorHex: true } } },
  })

  let entityIds: string[]

  if (siteGroup && siteGroup.entities.length > 0) {
    entityIds = siteGroup.entities.map((e) => e.id)
  } else {
    const entityById = await prisma.entity.findUnique({
      where: { id: entityGroup },
      select: { id: true },
    })
    if (!entityById) return null
    entityIds = [entityById.id]
  }

  const vacancy = await prisma.vacancy.findFirst({
    where: {
      id: vacancyId,
      entityId: { in: entityIds },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      location: true,
      type: true,
      description: true,
      content: true,
      status: true,
      createdAt: true,
      entity: { select: { name: true, colorHex: true } },
    },
  })

  if (!vacancy) return null

  const groupName = siteGroup?.name ?? vacancy.entity.name

  return { groupName, vacancy }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityGroup, vacancyId } = await params
  const data = await getVacancyData(entityGroup, vacancyId)

  if (!data || data.vacancy.status !== 'PUBLISHED') {
    return {
      title: 'Not Found',
      robots: { index: false, follow: false },
    }
  }

  const { vacancy, groupName } = data
  const descriptionText = vacancy.description
    ? vacancy.description.slice(0, 160)
    : `${vacancy.title} at ${groupName}`

  return {
    title: `${vacancy.title} — ${vacancy.entity.name}`,
    description: descriptionText,
    openGraph: {
      title: `${vacancy.title} — ${vacancy.entity.name}`,
      description: descriptionText,
      type: 'website',
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/jobs/${entityGroup}/${vacancyId}`,
    },
  }
}

export default async function PublicVacancyDetailPage({ params }: PageProps) {
  const { entityGroup, vacancyId } = await params
  const data = await getVacancyData(entityGroup, vacancyId)

  if (!data) {
    notFound()
  }

  const { vacancy, groupName } = data

  if (vacancy.status !== 'PUBLISHED') {
    notFound()
  }

  const t = await getTranslations('public.vacancy')
  const blocks = (Array.isArray(vacancy.content) ? vacancy.content : []) as unknown as ContentBlock[]
  const entityColor = vacancy.entity.colorHex

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: vacancy.title,
    datePosted: vacancy.createdAt.toISOString().split('T')[0],
    description: vacancy.description ?? '',
    ...(vacancy.location && {
      jobLocation: {
        '@type': 'Place',
        address: vacancy.location,
      },
    }),
    ...(vacancy.type && { employmentType: EMPLOYMENT_TYPE_MAP[vacancy.type] ?? vacancy.type.toUpperCase() }),
    hiringOrganization: {
      '@type': 'Organization',
      name: vacancy.entity.name,
    },
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/jobs/${entityGroup}/${vacancyId}`,
  }

  const postedDate = vacancy.createdAt.toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const TYPE_LABELS: Record<string, string> = {
    fulltime: t('typeFulltime'),
    parttime: t('typeParttime'),
    interim: t('typeInterim'),
    freelance: t('typeFreelance'),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[720px] px-4 py-4 flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: entityColor }}
            aria-hidden="true"
          >
            {vacancy.entity.name.charAt(0)}
          </span>
          <Link
            href={`/jobs/${entityGroup}`}
            className="text-sm font-medium text-gray-900 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
          >
            {groupName}
          </Link>
          <span className="text-gray-300" aria-hidden="true">/</span>
          <span className="text-sm text-gray-500 truncate">{vacancy.title}</span>
        </div>
      </nav>

      <main className="mx-auto max-w-[720px] px-4 py-8 pb-28 md:pb-8">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4 break-words">
            {vacancy.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            {vacancy.location && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {vacancy.location}
              </span>
            )}
            {vacancy.type && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {TYPE_LABELS[vacancy.type] ?? vacancy.type}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entityColor }}
                aria-hidden="true"
              />
              {vacancy.entity.name}
            </span>
            <span className="text-xs text-gray-500">
              {t('postedOn', { date: postedDate })}
            </span>
          </div>
        </header>

        {blocks.length > 0 ? (
          <ContentBlockRenderer
            blocks={blocks}
            vacancyId={vacancy.id}
            translations={{
              dealbreaker: t('dealbreaker'),
              niceToHave: t('niceToHave'),
              blockLabels: {
                text: t('description'),
                requirements: t('requirements'),
                benefits: t('benefits'),
              },
            }}
          />
        ) : vacancy.description ? (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-700">
              {vacancy.description}
            </p>
          </section>
        ) : null}

        <div className="hidden md:block mt-10">
          <Link
            href={`/jobs/${entityGroup}/${vacancyId}/apply`}
            className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-lg font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-opacity"
            style={{ backgroundColor: entityColor }}
          >
            {t('applyNow')}
          </Link>
        </div>
      </main>

      {/* Mobile sticky apply bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-gray-200 bg-white p-4">
        <Link
          href={`/jobs/${entityGroup}/${vacancyId}/apply`}
          className="flex items-center justify-center w-full rounded-lg py-3 text-lg font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-opacity"
          style={{ backgroundColor: entityColor }}
        >
          {t('applyNow')}
        </Link>
      </div>

      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="mx-auto max-w-[720px] px-4 py-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} {groupName}
        </div>
      </footer>
    </>
  )
}
