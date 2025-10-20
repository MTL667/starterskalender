'use client'

import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Mail, Shield } from 'lucide-react'

export default function WelcomePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Shield className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welkom bij Starterskalender</CardTitle>
          <CardDescription className="text-base">
            Je account is succesvol aangemaakt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Je toegang moet nog worden goedgekeurd
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  Een beheerder moet je de juiste rechten toekennen voordat je de applicatie kunt gebruiken.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Wat gebeurt er nu?
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Een beheerder ontvangt een notificatie over je aanvraag</li>
              <li>De beheerder beoordeelt je account en kent rechten toe</li>
              <li>Je ontvangt een e-mail wanneer je toegang hebt gekregen</li>
              <li>Je kunt dan inloggen en de applicatie gebruiken</li>
            </ol>
          </div>

          {session?.user && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Je account gegevens:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">E-mail:</span> {session.user.email}</p>
                <p><span className="font-medium">Naam:</span> {session.user.name || 'Niet ingesteld'}</p>
                <p><span className="font-medium">Status:</span> <span className="text-yellow-600 dark:text-yellow-500 font-medium">Wacht op goedkeuring</span></p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Vragen? Neem contact op met je beheerder of IT-afdeling.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            >
              Uitloggen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

