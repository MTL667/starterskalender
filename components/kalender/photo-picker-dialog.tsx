'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RefreshCw, Image as ImageIcon, Check, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'

type StarterImage = {
  driveId: string
  itemId: string
  fileName: string
  folder: string
  mimeType: string
  sizeBytes: number
  lastModified: string
  webUrl: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  starterId: string
  currentItemId?: string | null
  onPicked: () => void
}

export function PhotoPickerDialog({
  open,
  onOpenChange,
  starterId,
  currentItemId,
  onPicked,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<StarterImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [autoLinking, setAutoLinking] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/starters/${starterId}/photo/candidates`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || 'Kon afbeeldingen niet ophalen')
          setImages([])
        } else {
          setImages(data.images || [])
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Kon afbeeldingen niet ophalen')
          setImages([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, starterId])

  const handlePick = async (img: StarterImage) => {
    setSubmittingId(img.itemId)
    setError(null)
    try {
      const res = await fetch(`/api/starters/${starterId}/photo/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: img.driveId, itemId: img.itemId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Kon foto niet koppelen')
        return
      }
      onPicked()
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.message || 'Kon foto niet koppelen')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleAutoLink = async () => {
    setAutoLinking(true)
    setError(null)
    try {
      const res = await fetch(`/api/starters/${starterId}/photo/refresh`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Kon foto niet vernieuwen')
        return
      }
      onPicked()
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.message || 'Kon foto niet vernieuwen')
    } finally {
      setAutoLinking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Profielfoto kiezen</DialogTitle>
          <DialogDescription>
            Kies een afbeelding uit de SharePoint-map van deze starter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Afbeeldingen laden…
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm p-3 my-2">
              {error}
            </div>
          )}

          {!loading && !error && images.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Geen afbeeldingen gevonden in de SharePoint-map.
            </div>
          )}

          {!loading && images.length > 0 && (
            <ul className="divide-y">
              {images.map((img) => {
                const isCurrent = img.itemId === currentItemId
                const isSubmitting = submittingId === img.itemId
                return (
                  <li key={img.itemId}>
                    <button
                      type="button"
                      onClick={() => handlePick(img)}
                      disabled={!!submittingId}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/50 rounded-md px-2 transition-colors disabled:opacity-50"
                    >
                      <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          {img.fileName}
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-normal">
                              <Check className="h-3 w-3" /> huidig
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {img.folder && (
                            <span className="inline-flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {img.folder}
                            </span>
                          )}
                          <span>
                            {img.lastModified
                              ? format(new Date(img.lastModified), 'dd-MM-yyyy HH:mm')
                              : ''}
                          </span>
                          <span>{formatSize(img.sizeBytes)}</span>
                        </div>
                      </div>
                      {isSubmitting && (
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoLink}
            disabled={autoLinking || !!submittingId}
            title="Koppel automatisch de meest recente headshot-raw upload"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${autoLinking ? 'animate-spin' : ''}`} />
            Auto (meest recent)
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={autoLinking || !!submittingId}
          >
            Annuleren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
