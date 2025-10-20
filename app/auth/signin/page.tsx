'use client'

import { signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error in URL
  useEffect(() => {
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'AccessDenied':
          setError('Toegang geweigerd. Je organisatie is niet toegestaan om in te loggen, of je account is nog niet goedgekeurd.')
          break
        case 'Configuration':
          setError('Configuratiefout. Neem contact op met de beheerder.')
          break
        case 'Verification':
          setError('Verificatiefout. Probeer opnieuw in te loggen.')
          break
        default:
          setError('Er is een fout opgetreden bij het inloggen. Probeer het opnieuw.')
      }
    }
  }, [searchParams])

  const handleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Redirect to Azure AD for authentication
      await signIn('azure-ad', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Error signing in:', error)
      setError('Er is een fout opgetreden. Probeer opnieuw.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Starterskalender</CardTitle>
          <CardDescription>
            Log in met je organisatie account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleSignIn} 
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aan het inloggen...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Inloggen met Microsoft
              </>
            )}
          </Button>

          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Door in te loggen ga je akkoord met het gebruik van je organisatie credentials.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Eerste keer hier?
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              Log in met je organisatie account. Je account wordt automatisch aangemaakt en wacht op goedkeuring door een beheerder.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
