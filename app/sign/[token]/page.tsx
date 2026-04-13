'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { SignatureCapture } from '@/components/documents/signature-capture'

interface SignatureField {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  label: string
}

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
  signatureFields: SignatureField[] | null
  prerequisite: { id: string; title: string; status: string } | null
  starter: {
    firstName: string
    lastName: string
    entityName: string | null
    entityColor: string | null
  } | null
}

let pdfjsLib: any = null

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  }
  return pdfjsLib
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

  // PDF rendering
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [scale, setScale] = useState(1)
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 })

  // Signatures
  const [signatures, setSignatures] = useState<Record<string, string>>({})
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)

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
      if (data.status === 'SIGNED') setSigned(true)
    } catch {
      setError('Er ging iets mis bij het ophalen van het document')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchDocument() }, [fetchDocument])

  // Load PDF
  useEffect(() => {
    if (!doc || signed) return
    async function loadPdf() {
      const pdfjs = await getPdfJs()
      const pdfDocument = await pdfjs.getDocument(`/api/sign/${token}/pdf`).promise
      setPdfDoc(pdfDocument)
      setTotalPages(pdfDocument.numPages)
    }
    loadPdf().catch(console.error)
  }, [doc, token, signed])

  // Render page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return
    const page = await pdfDoc.getPage(currentPage)
    const containerWidth = containerRef.current.clientWidth - 16

    const viewport = page.getViewport({ scale: 1 })
    const computedScale = containerWidth / viewport.width
    setScale(computedScale)

    const scaledViewport = page.getViewport({ scale: computedScale })
    const canvas = canvasRef.current
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    setPdfDimensions({ width: scaledViewport.width, height: scaledViewport.height })

    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
  }, [pdfDoc, currentPage])

  useEffect(() => { renderPage() }, [renderPage])

  const fields = doc?.signatureFields || []
  const pageFields = fields.filter(f => f.page === currentPage)
  const allFieldsSigned = fields.length > 0 && fields.every(f => signatures[f.id])
  const hasFields = fields.length > 0

  const prerequisiteBlocked = doc?.prerequisite && doc.prerequisite.status !== 'SIGNED'
  const canSign = doc?.status === 'PENDING' && !prerequisiteBlocked && doc.signingMethod === 'SES'

  const handleSign = async () => {
    if (!signerName.trim() || signerName.trim().length < 2) return
    if (!agreedToTerms) return
    if (hasFields && !allFieldsSigned) return

    setSigning(true)
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signatures: hasFields ? signatures : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Ondertekening mislukt')
        return
      }

      const data = await res.json()
      setSigned(true)
      setDoc(prev =>
        prev ? { ...prev, status: 'SIGNED', signedAt: data.signedAt, signedByName: data.signedByName } : prev
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Document ondertekenen</h1>
            {doc.starter?.entityName && (
              <p className="text-sm text-gray-500">{doc.starter.entityName}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {signed && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-6 max-w-2xl mx-auto">
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
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            <div className="mt-6 flex flex-col items-center gap-3">
              <a
                href={`/api/sign/${token}/pdf?download=1`}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <FileText className="h-5 w-5" />
                Ondertekend document downloaden
              </a>
              <p className="text-sm text-gray-400">
                U kunt dit venster nu sluiten. Uw werkgever ontvangt automatisch een bevestiging.
              </p>
            </div>
          </div>
        )}

        {!signed && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* PDF Viewer with signature fields */}
            <div ref={containerRef} className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col" style={{ minHeight: '75vh' }}>
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{doc.fileName || doc.title}</span>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      Vorige
                    </button>
                    <span className="text-xs text-gray-500">{currentPage} / {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      Volgende
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto p-2 bg-gray-100">
                <div className="relative inline-block" style={{ width: pdfDimensions.width, height: pdfDimensions.height }}>
                  <canvas ref={canvasRef} className="block" />

                  {/* Signature field overlays */}
                  {pageFields.map(field => {
                    const isSigned = !!signatures[field.id]
                    return (
                      <div
                        key={field.id}
                        className={`absolute rounded transition-all ${
                          isSigned
                            ? 'border-2 border-green-500 bg-green-50/30'
                            : 'border-2 border-dashed border-blue-500 bg-blue-500/10 cursor-pointer hover:bg-blue-500/20'
                        }`}
                        style={{
                          left: field.x * scale,
                          top: field.y * scale,
                          width: field.width * scale,
                          height: field.height * scale,
                        }}
                        onClick={() => {
                          if (!isSigned && canSign) setActiveFieldId(field.id)
                        }}
                      >
                        {isSigned ? (
                          <img
                            src={signatures[field.id]}
                            alt="Handtekening"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-blue-600/70">
                            <PenLine className="h-5 w-5 mb-0.5" />
                            <span className="text-xs font-medium">Klik om te tekenen</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right panel */}
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

              {/* Signature progress */}
              {hasFields && (
                <div className="bg-white rounded-xl shadow-lg p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Handtekeningen</h3>
                  <div className="space-y-2">
                    {fields.map((f, i) => (
                      <div
                        key={f.id}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                          signatures[f.id] ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {signatures[f.id] ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                        )}
                        <span>{f.label || `Handtekening ${i + 1}`}</span>
                        {!signatures[f.id] && canSign && (
                          <button
                            onClick={() => setActiveFieldId(f.id)}
                            className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Tekenen
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
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

              {doc.signingMethod === 'QES' && (
                <div className="bg-purple-50 rounded-xl shadow-lg p-5 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-800">Itsme ondertekening</p>
                      <p className="text-sm text-purple-600">
                        Ondertekening via Itsme is momenteel nog niet beschikbaar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Signing form */}
              {canSign && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Bevestiging</h3>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
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
                      </span>
                    </label>

                    <button
                      onClick={handleSign}
                      disabled={
                        signing ||
                        !signerName.trim() ||
                        signerName.trim().length < 2 ||
                        !agreedToTerms ||
                        (hasFields && !allFieldsSigned)
                      }
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {signing ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Bezig met ondertekenen...</>
                      ) : (
                        <><PenLine className="h-5 w-5" /> Document ondertekenen</>
                      )}
                    </button>

                    {hasFields && !allFieldsSigned && (
                      <p className="text-xs text-amber-600 text-center">
                        Plaats eerst uw handtekening in alle velden op het document.
                      </p>
                    )}
                  </div>

                  <p className="mt-4 text-xs text-gray-400 text-center">
                    Uw IP-adres en naam worden geregistreerd als bewijs van ondertekening.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature capture modal */}
        {activeFieldId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <SignatureCapture
              onConfirm={(dataUrl) => {
                setSignatures(prev => ({ ...prev, [activeFieldId]: dataUrl }))
                setActiveFieldId(null)
              }}
              onCancel={() => setActiveFieldId(null)}
            />
          </div>
        )}
      </main>

      <footer className="mt-auto py-8 text-center">
        <p className="text-xs text-gray-400">Aangedreven door Airport</p>
      </footer>
    </div>
  )
}
