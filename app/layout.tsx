import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Airport",
  description: "Beheer je starters met een overzichtelijke kalender en automatische notificaties",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  const devMode = process.env.DEV_MODE === 'true'

  return (
    <html lang={locale}>
      <body className={inter.className}>
        {devMode && (
          <div className="bg-amber-500 text-amber-950 text-center text-sm font-semibold py-1.5 px-4 z-50">
            DEV OMGEVING — Dit is geen productieomgeving
          </div>
        )}
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

