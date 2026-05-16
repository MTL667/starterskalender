import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { VacancyCard } from '@/components/recruitment/public/vacancy-card'
import { EmptyState } from '@/components/recruitment/public/empty-state'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ entityGroup: string }>
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  fulltime: 'FULL_TIME',
  parttime: 'PART_TIME',
  interim: 'TEMPORARY',
  freelance: 'CONTRACTOR',
}

const getSiteGroupData = cache(async (slug: string) => {
  const siteGroup = await prisma.siteGroup.findUnique({
    where: { slug },
    include: {
      entities: { select: { id: true, name: true, colorHex: true } },
    },
  })

  if (!siteGroup || siteGroup.entities.length === 0) return null

  const entityIds = siteGroup.entities.map((e) => e.id)

  const vacancies = await prisma.vacancy.findMany({
    where: {
      status: 'PUBLISHED',
      deletedAt: null,
      entityId: { in: entityIds },
    },
    select: {
      id: true,
      title: true,
      location: true,
      type: true,
      description: true,
      updatedAt: true,
      createdAt: true,
      entity: { select: { name: true, colorHex: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { siteGroup, vacancies }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityGroup } = await params
  const data = await getSiteGroupData(entityGroup)

  if (!data) {
    return { title: 'Not Found' }
  }

  const orgName = data.siteGroup.name
  const count = data.vacancies.length

  return {
    title: `${orgName} — ${count === 0 ? 'Jobs' : `${count} open ${count === 1 ? 'position' : 'positions'}`}`,
    description: `Browse all open vacancies at ${orgName}`,
    openGraph: {
      title: `${orgName} — Open Positions`,
      description: `Browse all open vacancies at ${orgName}`,
      type: 'website',
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/jobs/${entityGroup}`,
    },
  }
}

export default async function PublicVacancyListingPage({ params }: PageProps) {
  const { entityGroup } = await params
  const data = await getSiteGroupData(entityGroup)

  if (!data) {
    notFound()
  }

  const { siteGroup, vacancies } = data
  const primaryEntity = siteGroup.entities[0]
  const t = await getTranslations('public.jobs')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Open positions at ${siteGroup.name}`,
    numberOfItems: vacancies.length,
    itemListElement: vacancies.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'JobPosting',
        title: v.title,
        datePosted: v.createdAt.toISOString().split('T')[0],
        ...(v.location && {
          jobLocation: {
            '@type': 'Place',
            address: v.location,
          },
        }),
        ...(v.type && { employmentType: EMPLOYMENT_TYPE_MAP[v.type] ?? v.type.toUpperCase() }),
        hiringOrganization: {
          '@type': 'Organization',
          name: v.entity.name,
        },
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/jobs/${entityGroup}/${v.id}`,
      },
    })),
  }

  const typeLabels: Record<string, string> = {
    fulltime: 'Voltijd',
    parttime: 'Deeltijd',
    interim: 'Interim',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: primaryEntity.colorHex }}
            aria-hidden="true"
          >
            {primaryEntity.name.charAt(0)}
          </span>
          <span className="text-sm font-medium text-gray-900">{siteGroup.name}</span>
          <span className="ml-auto text-sm text-gray-500">
            {t('openCount', { count: vacancies.length })}
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="sr-only">{t('title', { org: siteGroup.name })}</h1>

        {vacancies.length === 0 ? (
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDescription', { org: siteGroup.name })}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {vacancies.map((v) => {
              const days = Math.max(0, Math.floor((Date.now() - v.createdAt.getTime()) / 86400000))
              return (
                <VacancyCard
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  location={v.location}
                  type={v.type}
                  entityName={v.entity.name}
                  entityColor={v.entity.colorHex}
                  description={v.description}
                  publishedAt={v.createdAt.toISOString()}
                  siteGroupSlug={entityGroup}
                  translations={{
                    postedAgo: t('postedAgo', { days }),
                    typeLabels,
                  }}
                />
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} {siteGroup.name}
        </div>
      </footer>
    </>
  )
}
