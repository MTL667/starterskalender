'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AuditLogPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar Admin
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>
            Overzicht van alle acties in de applicatie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">Audit log viewer komt binnenkort</p>
            <p className="text-sm">
              Alle acties worden gelogd in de database.
              Gebruik Prisma Studio om de audit logs te bekijken.
            </p>
            <div className="mt-6 p-4 bg-muted rounded-lg text-left text-sm">
              <p className="font-medium mb-2">Gelogde acties:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>CREATE, UPDATE, DELETE van starters</li>
                <li>CREATE, UPDATE, DELETE van entiteiten</li>
                <li>EMAIL_SENT, EMAIL_FAILED</li>
                <li>LOGIN acties</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

