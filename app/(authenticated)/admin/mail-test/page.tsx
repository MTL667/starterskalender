'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function MailTestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/mail-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: 'Test e-mail succesvol verzonden!' })
        setEmail('')
      } else {
        setResult({ success: false, message: data.error || 'Er is een fout opgetreden' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Netwerkfout. Probeer opnieuw.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar Admin
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>E-mail Test</CardTitle>
              <CardDescription>
                Verstuur een test e-mail om de SendGrid configuratie te valideren
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Test e-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                De test e-mail wordt naar dit adres verzonden
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Verzenden...' : 'Verstuur Test E-mail'}
            </Button>
          </form>

          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {result.message}
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2">SendGrid Configuratie</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Van:</strong> {process.env.NEXT_PUBLIC_MAIL_FROM || 'Niet geconfigureerd'}
              </p>
              <p>
                <strong>Reply-to:</strong> {process.env.NEXT_PUBLIC_MAIL_REPLY_TO || 'Niet geconfigureerd'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

