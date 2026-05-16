import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function VacancyNotFound() {
  const t = await getTranslations('public.vacancy')

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <Briefcase className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {t('closedTitle')}
        </h1>
        <p className="text-base text-gray-500 max-w-md mb-8">
          {t('closedDescription')}
        </p>
        <Link
          href=".."
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-3 py-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('backToListing')}
        </Link>
      </div>
    </>
  )
}
