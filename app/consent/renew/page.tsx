'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Shield, Loader2 } from 'lucide-react'

export default function ConsentRenewPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  async function handleRenew() {
    if (!token) return
    setStatus('loading')
    try {
      const res = await fetch('/api/public/consent/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setExpiresAt(data.expiresAt)
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">Ongeldige link</h1>
          <p className="text-muted-foreground">Deze link is ongeldig of verlopen.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h1 className="text-xl font-bold mb-2">Toestemming verlengd</h1>
          <p className="text-muted-foreground">
            Uw gegevens worden bewaard tot{' '}
            {expiresAt ? new Date(expiresAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-4">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold">Toestemming verlengen</h1>
        <p className="text-muted-foreground">
          Uw kandidaatgegevens staan gepland voor verwijdering. Klik hieronder om uw toestemming te verlengen en uw profiel actief te houden.
        </p>
        {status === 'error' && (
          <p className="text-sm text-destructive">Er ging iets mis. De link is mogelijk verlopen.</p>
        )}
        <Button onClick={handleRenew} disabled={status === 'loading'} size="lg">
          {status === 'loading' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Toestemming verlengen
        </Button>
      </div>
    </div>
  )
}
