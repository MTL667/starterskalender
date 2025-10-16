'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function UsersAdminPage() {
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
          <CardTitle>Gebruikers & Rechten</CardTitle>
          <CardDescription>
            Beheer gebruikers, rollen en entiteit memberships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">Gebruikersbeheer komt binnenkort</p>
            <p className="text-sm">
              Voor nu worden gebruikers automatisch aangemaakt bij eerste login.
              Gebruik de database (Prisma Studio) om rollen en memberships te beheren.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <a href="https://www.prisma.io/docs/concepts/components/prisma-studio" target="_blank" rel="noopener noreferrer">
                Meer info over Prisma Studio
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

