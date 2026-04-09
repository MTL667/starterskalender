'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  PenLine,
  ShieldAlert,
} from 'lucide-react'

interface DocumentData {
  id: string
  title: string
  status: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED'
  signingMethod: string
  fileName: string | null
  dueDate: string | null
  signedAt: string | null
  signedByName: string | null
  previewUrl: string | null
  prerequisite: { id: string; title: string; status: string } | null
  starter: {
    firstName: string
    lastName: string
    entityName: string | null
    entityColor: string | null
  } | null
}

export default function SigningPage() {
  const { token } = useParams<{ token: string }>()
  const [doc, setDoc] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/sign/${token}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Document niet gevonden')
        return
      }
      const data = await res.json()
      setDoc(data)
      if (data.status === 'SIGNED') {
        setSigned(true)
      }
    } catch {
      setError('Er ging iets mis bij het ophalen van het document')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  const handleSign = async () => {
    if (!signerName.trim() || signerName.trim().length < 2) return
    if (!agreedToTerms) return

    setSigning(true)
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName: signerName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Ondertekening mislukt')
        return
      }

      const data = await res.json()
      setSigned(true)
      setDoc((prev) =>
        prev
          ? { ...prev, status: 'SIGNED', signedAt: data.signedAt, signedByName: data.signedByName }
          : prev
      )
    } catch {
      setError('Er ging iets mis bij het ondertekenen')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Document ophalen...</p>
        </div>
      </div>
    )
  }

  if (error && !doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Document niet beschikbaar</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!doc) return null

  const prerequisiteBlocked = doc.prerequisite && doc.prerequisite.status !== 'SIGNED'
  const canSign = doc.status === 'PENDING' && !prerequisiteBlocked && doc.signingMethod === 'SES'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Document ondertekenen</h1>
            {doc.starter?.entityName && (
              <p className="text-sm text-gray-500">{doc.starter.entityName}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Success state */}
        {signed && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Succesvol ondertekend</h2>
            <p className="text-gray-500 mb-4">
              &ldquo;{doc.title}&rdquo; is ondertekend door {doc.signedByName}
            </p>
            {doc.signedAt && (
              <p className="text-sm text-gray-400">
                Op {new Date(doc.signedAt).toLocaleDateString('nl-BE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left text-sm text-gray-500">
              <p>U kunt dit venster nu sluiten. Uw werkgever ontvangt automatisch een bevestiging.</p>
            </div>
          </div>
        )}

        {/* Document card with PDF + signing form side by side */}
        {!signed && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* PDF Viewer — left side */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col" style={{ minHeight: '70vh' }}>
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{doc.fileName || doc.title}</span>
              </div>
              <div className="flex-1">
                <iframe
                  src={`/api/sign/${token}/pdf`}
                  className="w-full h-full border-0"
                  title="Document preview"
                  style={{ minHeight: '65vh' }}
                />
              </div>
            </div>

            {/* Signing panel — right side */}
            <div className="lg:col-span-2 space-y-4">
              {/* Document info */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">{doc.title}</h2>
                    {doc.starter && (
                      <p className="text-gray-500 text-sm mt-0.5">
                        Voor {doc.starter.firstName} {doc.starter.lastName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        <PenLine className="h-3 w-3" />
                        {doc.signingMethod === 'QES' ? 'Itsme' : 'Digitaal'}
                      </span>
                      {doc.dueDate && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                          <Clock className="h-3 w-3" />
                          Vóór {new Date(doc.dueDate).toLocaleDateString('nl-BE')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prerequisite warning */}
              {prerequisiteBlocked && (
                <div className="bg-amber-50 rounded-xl shadow-lg p-5 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Volgorde vereist</p>
                      <p className="text-sm text-amber-600">
                        U moet eerst &ldquo;{doc.prerequisite?.title}&rdquo; ondertekenen.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* QES not yet available */}
              {doc.signingMethod === 'QES' && (
                <div className="bg-purple-50 rounded-xl shadow-lg p-5 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-800">Itsme ondertekening</p>
                      <p className="text-sm text-purple-600">
                        Ondertekening via Itsme is momenteel nog niet beschikbaar. Neem contact op met uw werkgever.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Signing form */}
              {canSign && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Ondertekenen</h3>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="signerName" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Uw volledige naam
                      </label>
                      <input
                        id="signerName"
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Voornaam Achternaam"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        disabled={signing}
                      />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={signing}
                      />
                      <span className="text-sm text-gray-600">
                        Ik verklaar dat ik bovenstaand document heb gelezen en ga akkoord met de inhoud.
                        Door te ondertekenen bevestig ik mijn identiteit als de genoemde persoon.
                      </span>
                    </label>

                    <button
                      onClick={handleSign}
                      disabled={signing || !signerName.trim() || signerName.trim().length < 2 || !agreedToTerms}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {signing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Bezig met ondertekenen...
                        </>
                      ) : (
                        <>
                          <PenLine className="h-5 w-5" />
                          Document ondertekenen
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-gray-400 text-center">
                    Uw IP-adres en naam worden geregistreerd als bewijs van ondertekening.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center">
        <p className="text-xs text-gray-400">
          Aangedreven door Starterskalender
        </p>
      </footer>
    </div>
  )
}
