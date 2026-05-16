import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { ApplicationForm } from '@/components/recruitment/public/application-form'

interface PageProps {
  params: Promise<{ entityGroup: string; vacancyId: string }>
}

const getVacancyData = cache(async (entityGroup: string, vacancyId: string) => {
  const siteGroup = await prisma.siteGroup.findUnique({
    where: { slug: entityGroup },
    select: { id: true, name: true, entities: { select: { id: true } } },
  })

  if (!siteGroup || siteGroup.entities.length === 0) return null

  const entityIds = siteGroup.entities.map((e) => e.id)

  const vacancy = await prisma.vacancy.findFirst({
    where: {
      id: vacancyId,
      entityId: { in: entityIds },
      status: 'PUBLISHED',
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      dealbreakers: true,
      niceToHaves: true,
      entity: { select: { name: true, colorHex: true } },
    },
  })

  if (!vacancy) return null

  return { siteGroup, vacancy }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityGroup, vacancyId } = await params
  const data = await getVacancyData(entityGroup, vacancyId)

  if (!data) {
    return { title: 'Not Found', robots: { index: false, follow: false } }
  }

  return {
    title: `Apply — ${data.vacancy.title}`,
    robots: { index: false, follow: false },
  }
}

export default async function ApplyPage({ params }: PageProps) {
  const { entityGroup, vacancyId } = await params
  const data = await getVacancyData(entityGroup, vacancyId)

  if (!data) {
    notFound()
  }

  const { vacancy, siteGroup } = data
  const t = await getTranslations('public.apply')

  const translations = {
    title: t('title'),
    emailLabel: t('emailLabel'),
    emailPlaceholder: t('emailPlaceholder'),
    emailError: t('emailError'),
    cvLabel: t('cvLabel'),
    cvDropzone: t('cvDropzone'),
    cvError: t('cvError'),
    motivationLabel: t('motivationLabel'),
    motivationPlaceholder: t('motivationPlaceholder'),
    privacyNotice: t('privacyNotice', { link: `<a href="/privacy" class="underline hover:text-gray-900">${t('privacyLink')}</a>` }),
    submit: t('submit'),
    submitting: t('submitting'),
    successTitle: t('successTitle'),
    successDescription: t('successDescription'),
    alreadyApplied: t('alreadyApplied'),
    fileTooLarge: t('fileTooLarge'),
    fileWrongType: t('fileWrongType'),
  }

  return (
    <>
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[480px] px-4 py-4 flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: vacancy.entity.colorHex }}
            aria-hidden="true"
          >
            {vacancy.entity.name.charAt(0)}
          </span>
          <Link
            href={`/jobs/${entityGroup}/${vacancyId}`}
            className="text-sm font-medium text-gray-900 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
          >
            {vacancy.title}
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-[480px] px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {translations.title}
        </h1>

        <ApplicationForm
          vacancyId={vacancy.id}
          entityColor={vacancy.entity.colorHex}
          dealbreakers={Array.isArray(vacancy.dealbreakers) ? vacancy.dealbreakers as any : []}
          niceToHaves={Array.isArray(vacancy.niceToHaves) ? vacancy.niceToHaves as any : []}
          translations={translations}
        />
      </main>

      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="mx-auto max-w-[480px] px-4 py-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {siteGroup.name}
        </div>
      </footer>
    </>
  )
}
