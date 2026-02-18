'use client'

import { useTranslations } from 'next-intl'
import { signIn } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'

const isDevelopment = process.env.NODE_ENV === 'development'

function SignInForm() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [devLoading, setDevLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devEmail, setDevEmail] = useState('admin@test.local')

  // Check for error in URL
  useEffect(() => {
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'AccessDenied':
          setError(t('accessDenied'))
          break
        case 'Configuration':
          setError(t('configError'))
          break
        case 'Verification':
          setError(t('verificationError'))
          break
        default:
          setError(t('loginError'))
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
      setError(t('errorClickRetry'))
      setLoading(false)
    }
  }

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setDevLoading(true)
      setError(null)
      
      await signIn('dev-credentials', { 
        email: devEmail,
        callbackUrl: '/dashboard' 
      })
    } catch (error) {
      console.error('Error signing in:', error)
      setError(t('loginError'))
      setDevLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('appTitle')}</CardTitle>
          <CardDescription>
            {t('loginWithOrg')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Development Login Form */}
          {isDevelopment && (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  🔧 Development Mode
                </p>
                <p className="text-amber-800 dark:text-amber-200">
                  {t('devLoginDescription')}
                </p>
              </div>
              
              <form onSubmit={handleDevSignIn} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="devEmail">Email</Label>
                  <Input
                    id="devEmail"
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="admin@test.local"
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700" 
                  size="lg"
                  disabled={devLoading}
                >
                  {devLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('loggingIn')}
                    </>
                  ) : (
                    'Development Login'
                  )}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t('orProductionLogin')}
                  </span>
                </div>
              </div>
            </>
          )}

          <Button 
            onClick={handleSignIn} 
            className="w-full" 
            size="lg"
            disabled={loading}
            variant={isDevelopment ? 'outline' : 'default'}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('loggingIn')}
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                {t('loginWithMicrosoft')}
              </>
            )}
          </Button>

          {!isDevelopment && (
            <>
              <div className="pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  {t('agreeCredentials')}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  {t('firstTimeHere')}
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  {t('accountAutoCreated')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
