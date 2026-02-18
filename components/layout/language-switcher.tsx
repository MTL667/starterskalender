'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale } from 'next-intl'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const toggleLocale = async () => {
    const newLocale = locale === 'nl' ? 'fr' : 'nl'

    try {
      await fetch('/api/user/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      })
    } catch {
      // Cookie is set server-side, but also set it client-side as fallback
    }

    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      disabled={isPending}
      className="font-medium text-xs px-2"
      title={locale === 'nl' ? 'Passer au français' : 'Overschakelen naar Nederlands'}
    >
      {locale === 'nl' ? 'FR' : 'NL'}
    </Button>
  )
}
