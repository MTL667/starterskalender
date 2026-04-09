'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import SignaturePad from 'signature_pad'
import { PenLine, Type, Upload, RotateCcw, Check } from 'lucide-react'

type Mode = 'draw' | 'type' | 'upload'

interface Props {
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
}

const HANDWRITING_FONTS = [
  { name: 'Cursive', value: 'cursive' },
  { name: 'Serif', value: "'Times New Roman', serif" },
  { name: 'Script', value: "'Brush Script MT', 'Segoe Script', cursive" },
]

export function SignatureCapture({ onConfirm, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>('draw')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState(HANDWRITING_FONTS[0].value)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)

      padRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255,255,255,0)',
        penColor: '#1a1a2e',
        minWidth: 1.5,
        maxWidth: 3,
      })

      return () => {
        padRef.current?.off()
        padRef.current = null
      }
    }
  }, [mode])

  function handleClear() {
    if (mode === 'draw') padRef.current?.clear()
    if (mode === 'type') setTypedName('')
    if (mode === 'upload') setUploadedImage(null)
  }

  function renderTypedSignature(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 200
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(255,255,255,0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1a1a2e'
    ctx.font = `italic 56px ${selectedFont}`
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, 20, 100)
    return canvas.toDataURL('image/png')
  }

  function handleConfirm() {
    let dataUrl: string | null = null

    if (mode === 'draw') {
      if (padRef.current?.isEmpty()) return
      dataUrl = padRef.current?.toDataURL('image/png') || null
    } else if (mode === 'type') {
      if (!typedName.trim()) return
      dataUrl = renderTypedSignature()
    } else if (mode === 'upload') {
      dataUrl = uploadedImage
    }

    if (dataUrl) onConfirm(dataUrl)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setUploadedImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const isEmpty =
    (mode === 'draw' && padRef.current?.isEmpty()) ||
    (mode === 'type' && !typedName.trim()) ||
    (mode === 'upload' && !uploadedImage)

  return (
    <div className="bg-white rounded-xl shadow-xl border p-5 w-full max-w-md">
      <h3 className="font-semibold text-gray-900 mb-3">Uw handtekening</h3>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
        {([
          { m: 'draw' as Mode, icon: PenLine, label: 'Tekenen' },
          { m: 'type' as Mode, icon: Type, label: 'Typen' },
          { m: 'upload' as Mode, icon: Upload, label: 'Uploaden' },
        ]).map(({ m, icon: Icon, label }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              mode === m
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Drawing pad */}
      {mode === 'draw' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white mb-3" style={{ height: 160 }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair rounded-lg"
            style={{ touchAction: 'none' }}
          />
        </div>
      )}

      {/* Type signature */}
      {mode === 'type' && (
        <div className="mb-3 space-y-3">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Typ uw naam..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex gap-2">
            {HANDWRITING_FONTS.map(f => (
              <button
                key={f.value}
                onClick={() => setSelectedFont(f.value)}
                className={`flex-1 py-2 px-2 border rounded-lg text-center transition-all ${
                  selectedFont === f.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span style={{ fontFamily: f.value, fontStyle: 'italic', fontSize: 18 }}>
                  {typedName || 'Naam'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload signature */}
      {mode === 'upload' && (
        <div className="mb-3">
          {uploadedImage ? (
            <div className="border-2 border-gray-200 rounded-lg p-4 flex items-center justify-center bg-white" style={{ height: 160 }}>
              <img src={uploadedImage} alt="Handtekening" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors" style={{ height: 160 }}>
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Klik om een afbeelding te uploaden</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG of SVG</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Wissen
        </button>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Annuleren
        </button>
        <button
          onClick={handleConfirm}
          disabled={!!isEmpty}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="h-4 w-4" />
          Bevestigen
        </button>
      </div>
    </div>
  )
}
