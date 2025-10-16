'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn('email', { email, redirect: false })
      setSuccess(true)
    } catch (error) {
      console.error('Error signing in:', error)
      alert('Er is een fout opgetreden. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const handleOIDC = () => {
    signIn('oidc', { callbackUrl: '/dashboard' })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check je e-mail</CardTitle>
            <CardDescription>
              We hebben je een magic link gestuurd naar {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Klik op de link in de e-mail om in te loggen.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inloggen</CardTitle>
          <CardDescription>
            Log in op de Starterskalender
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Bezig...' : 'Verstuur magic link'}
            </Button>
          </form>

          {process.env.NEXT_PUBLIC_OIDC_ENABLED === 'true' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Of</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleOIDC}
              >
                Inloggen met OIDC
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

