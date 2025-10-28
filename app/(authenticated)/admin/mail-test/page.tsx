'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface MailConfig {
  apiKeyConfigured: boolean
  fromEmail: string | null
  replyTo: string | null
}

export default function MailTestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [config, setConfig] = useState<MailConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/mail-config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Error loading mail config:', error)
    } finally {
      setConfigLoading(false)
    }
  }

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
        setResult({ success: false, message: data.error || data.details || 'Er is een fout opgetreden' })
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
            <h3 className="font-semibold mb-3">SendGrid Configuratie</h3>
            
            {configLoading ? (
              <p className="text-sm text-muted-foreground">Laden...</p>
            ) : config ? (
              <div className="space-y-3">
                {/* API Key Status */}
                <div className="flex items-center gap-2">
                  {config.apiKeyConfigured ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    <strong>API Key:</strong> {config.apiKeyConfigured ? 'Geconfigureerd ✓' : 'Niet geconfigureerd'}
                  </span>
                </div>

                {/* From Email */}
                <div className="flex items-center gap-2">
                  {config.fromEmail ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">
                    <strong>Van:</strong> {config.fromEmail || 'Niet geconfigureerd'}
                  </span>
                </div>

                {/* Reply-To */}
                <div className="flex items-center gap-2">
                  {config.replyTo ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    <strong>Reply-to:</strong> {config.replyTo || 'Niet geconfigureerd (optioneel)'}
                  </span>
                </div>

                {/* Missing Config Warning */}
                {(!config.apiKeyConfigured || !config.fromEmail) && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">⚠️ Configuratie Onvolledig</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Voeg de volgende environment variabelen toe in Easypanel:
                    </p>
                    <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                      {!config.apiKeyConfigured && <li>SENDGRID_API_KEY</li>}
                      {!config.fromEmail && <li>SENDGRID_FROM_EMAIL</li>}
                    </ul>
                  </div>
                )}

                {/* SendGrid Verification Reminder */}
                {config.fromEmail && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">ℹ️ Sender Verification</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Zorg ervoor dat <code className="bg-blue-100 px-1 py-0.5 rounded">{config.fromEmail}</code> geverifieerd is in SendGrid.
                    </p>
                    <a 
                      href="https://app.sendgrid.com/settings/sender_auth" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                    >
                      → Verifieer in SendGrid Dashboard
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-600">Fout bij laden van configuratie</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

