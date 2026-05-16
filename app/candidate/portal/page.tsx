'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Shield, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react'

interface PortalData {
  firstName: string
  lastName: string
  status: string
  starterId: string | null
  startDate: string | null
  entityName: string | null
  roleTitle: string | null
  vacancyTitle: string
  stageName: string
}

export default function CandidatePortalPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`/api/public/candidate/portal?token=${token}`)
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json()
          setData(json.data)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">Kandidaat niet gevonden</h1>
          <p className="text-muted-foreground">Deze link is ongeldig, verlopen, of uw gegevens zijn verwijderd conform ons privacybeleid.</p>
        </div>
      </div>
    )
  }

  const isHired = !!data.starterId

  if (isHired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
            <h1 className="text-2xl font-bold">Welkom, {data.firstName}!</h1>
            <p className="text-lg text-muted-foreground">
              {data.startDate
                ? `Uw onboarding start op ${new Date(data.startDate).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Uw onboarding wordt gepland'}
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Overzicht</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.entityName && (
                <div>
                  <span className="text-muted-foreground">Entiteit</span>
                  <p className="font-medium">{data.entityName}</p>
                </div>
              )}
              {data.roleTitle && (
                <div>
                  <span className="text-muted-foreground">Functie</span>
                  <p className="font-medium">{data.roleTitle}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Vacature</span>
                <p className="font-medium">{data.vacancyTitle}</p>
              </div>
              {data.startDate && (
                <div>
                  <span className="text-muted-foreground">Startdatum</span>
                  <p className="font-medium">
                    {new Date(data.startDate).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <TimelineStep label="Sollicitatie" active />
            <ArrowRight className="h-4 w-4" />
            <TimelineStep label="Aangenomen" active />
            <ArrowRight className="h-4 w-4" />
            <TimelineStep label="Pre-onboarding" active={!!data.startDate} />
            <ArrowRight className="h-4 w-4" />
            <TimelineStep label="Eerste dag" active={false} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6 text-center">
        <Clock className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Hallo, {data.firstName}!</h1>
        <p className="text-muted-foreground">
          Uw sollicitatie voor <strong>{data.vacancyTitle}</strong> wordt beoordeeld.
        </p>
        <div className="border rounded-lg p-4 text-left">
          <p className="text-sm"><span className="text-muted-foreground">Status:</span> <strong>{data.stageName}</strong></p>
        </div>
      </div>
    </div>
  )
}

function TimelineStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`text-center ${active ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
      <div className={`h-3 w-3 rounded-full mx-auto mb-1 ${active ? 'bg-green-600' : 'bg-muted'}`} />
      <span className="text-xs">{label}</span>
    </div>
  )
}
