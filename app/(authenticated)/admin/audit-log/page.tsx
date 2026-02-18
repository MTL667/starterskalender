'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AuditLogPage() {
  const t = useTranslations('adminAuditLog')
  const tc = useTranslations('common')
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('backToAdmin')}
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">{t('comingSoon')}</p>
            <p className="text-sm">
              {t('dbInfo')}
            </p>
            <div className="mt-6 p-4 bg-muted rounded-lg text-left text-sm">
              <p className="font-medium mb-2">{t('loggedActions')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('actionStarters')}</li>
                <li>{t('actionEntities')}</li>
                <li>{t('actionEmail')}</li>
                <li>{t('actionLogin')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

