'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { PenLine, Plus, Trash2, ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react'

export interface SignatureFieldDef {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  label: string
}

interface Props {
  pdfUrl: string
  initialFields?: SignatureFieldDef[]
  onSave: (fields: SignatureFieldDef[]) => Promise<void>
  onClose?: () => void
}

let pdfjsLib: any = null

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
  }
  return pdfjsLib
}

export function PdfFieldPlacer({ pdfUrl, initialFields = [], onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fields, setFields] = useState<SignatureFieldDef[]>(initialFields)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [scale, setScale] = useState(1)
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 })
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [resizing, setResizing] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    async function loadPdf() {
      const pdfjs = await getPdfJs()
      const doc = await pdfjs.getDocument(pdfUrl).promise
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
    }
    loadPdf()
  }, [pdfUrl])

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return
    const page = await pdfDoc.getPage(currentPage)
    const containerWidth = containerRef.current.clientWidth - 32

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

  useEffect(() => {
    renderPage()
  }, [renderPage])

  const pageFields = fields.filter(f => f.page === currentPage)

  function getRelativePos(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    }
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (dragging || resizing) return
    const pos = getRelativePos(e)
    setDrawing(true)
    setDrawStart(pos)
    setDrawCurrent(pos)
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (drawing && drawStart) {
      setDrawCurrent(getRelativePos(e))
    }
  }

  function handleCanvasMouseUp() {
    if (drawing && drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x)
      const y = Math.min(drawStart.y, drawCurrent.y)
      const width = Math.abs(drawCurrent.x - drawStart.x)
      const height = Math.abs(drawCurrent.y - drawStart.y)

      if (width > 20 && height > 15) {
        const newField: SignatureFieldDef = {
          id: `sig-${Date.now()}`,
          page: currentPage,
          x, y, width, height,
          label: `Handtekening ${fields.length + 1}`,
        }
        setFields(prev => [...prev, newField])
      }
    }
    setDrawing(false)
    setDrawStart(null)
    setDrawCurrent(null)
  }

  function handleFieldMouseDown(e: React.MouseEvent, fieldId: string) {
    e.stopPropagation()
    const field = fields.find(f => f.id === fieldId)
    if (!field) return
    const pos = getRelativePos(e)
    setDragging(fieldId)
    setDragOffset({ x: pos.x - field.x, y: pos.y - field.y })
  }

  function handleFieldMove(e: React.MouseEvent) {
    if (!dragging) return
    const pos = getRelativePos(e)
    setFields(prev => prev.map(f =>
      f.id === dragging ? { ...f, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : f
    ))
  }

  function handleFieldUp() {
    setDragging(null)
    setResizing(null)
  }

  function handleResizeMouseDown(e: React.MouseEvent, fieldId: string) {
    e.stopPropagation()
    setResizing(fieldId)
  }

  function handleResizeMove(e: React.MouseEvent) {
    if (!resizing) return
    const pos = getRelativePos(e)
    setFields(prev => prev.map(f => {
      if (f.id !== resizing) return f
      const newWidth = Math.max(60, pos.x - f.x)
      const newHeight = Math.max(30, pos.y - f.y)
      return { ...f, width: newWidth, height: newHeight }
    }))
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  function addQuickField() {
    const viewport = pdfDimensions
    const newField: SignatureFieldDef = {
      id: `sig-${Date.now()}`,
      page: currentPage,
      x: (viewport.width / scale - 200) / 2,
      y: (viewport.height / scale) - 120,
      width: 200,
      height: 60,
      label: `Handtekening ${fields.length + 1}`,
    }
    setFields(prev => [...prev, newField])
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(fields)
    } finally {
      setSaving(false)
    }
  }

  const drawRect = drawing && drawStart && drawCurrent
    ? {
        left: Math.min(drawStart.x, drawCurrent.x) * scale,
        top: Math.min(drawStart.y, drawCurrent.y) * scale,
        width: Math.abs(drawCurrent.x - drawStart.x) * scale,
        height: Math.abs(drawCurrent.y - drawStart.y) * scale,
      }
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addQuickField}>
            <Plus className="h-4 w-4 mr-1" />
            Handtekeningveld
          </Button>
          <span className="text-xs text-gray-500">
            of teken een rechthoek op de PDF
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">{currentPage} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>Annuleren</Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || fields.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Opslaan ({fields.length} veld{fields.length !== 1 ? 'en' : ''})
          </Button>
        </div>
      </div>

      {/* PDF + overlay */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center"
      >
        <div
          className="relative inline-block shadow-lg"
          style={{ width: pdfDimensions.width, height: pdfDimensions.height }}
          onMouseMove={(e) => {
            handleCanvasMouseMove(e)
            handleFieldMove(e)
            handleResizeMove(e)
          }}
          onMouseUp={() => {
            handleCanvasMouseUp()
            handleFieldUp()
          }}
          onMouseLeave={() => {
            handleFieldUp()
            if (drawing) {
              setDrawing(false)
              setDrawStart(null)
              setDrawCurrent(null)
            }
          }}
        >
          <canvas
            ref={canvasRef}
            className="block cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
          />

          {/* Drawing rectangle preview */}
          {drawRect && (
            <div
              className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
              style={drawRect}
            />
          )}

          {/* Placed fields */}
          {pageFields.map(field => (
            <div
              key={field.id}
              className="absolute border-2 border-blue-600 bg-blue-500/15 rounded cursor-move group hover:bg-blue-500/25 transition-colors"
              style={{
                left: field.x * scale,
                top: field.y * scale,
                width: field.width * scale,
                height: field.height * scale,
              }}
              onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
            >
              <div className="absolute -top-6 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                  {field.label}
                </span>
                <button
                  className="p-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={(e) => { e.stopPropagation(); removeField(field.id) }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center justify-center h-full text-blue-600/60 pointer-events-none">
                <PenLine className="h-5 w-5 mr-1" />
                <span className="text-xs font-medium">Handtekening</span>
              </div>
              {/* Resize handle */}
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 cursor-se-resize rounded-tl"
                onMouseDown={(e) => handleResizeMouseDown(e, field.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
