'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Folder, Search, ChevronLeft, ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import type { MediaContent } from '@/lib/recruitment/types'

interface PhotoItem {
  driveId: string
  itemId: string
  fileName: string
  mimeType: string
  width?: number
  height?: number
  sizeBytes: number
}

interface PhotoLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (photo: MediaContent) => void
  entityId?: string
}

export function PhotoLibraryDialog({ open, onOpenChange, onSelect, entityId }: PhotoLibraryDialogProps) {
  const t = useTranslations('recruitment')
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [folders, setFolders] = useState<Array<{ name: string }>>([])
  const [currentFolder, setCurrentFolder] = useState('')
  const [folderStack, setFolderStack] = useState<string[]>([])
  const [selected, setSelected] = useState<PhotoItem | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPhotos = useCallback(async (folder: string, searchQuery: string) => {
    if (!entityId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ entityId })
      if (folder) params.set('folder', folder)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/recruitment/sharepoint/photos?${params}`)
      if (!res.ok) {
        const result = await res.json().catch(() => null)
        if (result?.error?.code === 'GRAPH_UNAVAILABLE' || result?.error?.code === 'NOT_CONFIGURED') {
          setError(t('media.libraryUnavailable'))
        } else {
          setError(t('media.loadError'))
        }
        return
      }
      const result = await res.json()
      setPhotos(result.data.photos)
      setFolders(result.data.folders)
    } catch {
      setError(t('media.libraryUnavailable'))
    } finally {
      setLoading(false)
    }
  }, [entityId, t])

  useEffect(() => {
    if (open && entityId) {
      setSelected(null)
      setSearch('')
      setCurrentFolder('')
      setFolderStack([])
      fetchPhotos('', '')
    }
  }, [open, entityId, fetchPhotos])

  const handleFolderClick = (folderName: string) => {
    const newFolder = currentFolder ? `${currentFolder}/${folderName}` : folderName
    setFolderStack([...folderStack, currentFolder])
    setCurrentFolder(newFolder)
    setSelected(null)
    fetchPhotos(newFolder, '')
  }

  const handleBack = () => {
    const prev = folderStack[folderStack.length - 1] ?? ''
    setFolderStack(folderStack.slice(0, -1))
    setCurrentFolder(prev)
    setSelected(null)
    fetchPhotos(prev, '')
  }

  const handleSearch = () => {
    fetchPhotos(currentFolder, search)
  }

  const handleConfirm = () => {
    if (!selected) return
    onSelect({
      driveId: selected.driveId,
      itemId: selected.itemId,
      fileName: selected.fileName,
      mimeType: selected.mimeType,
      width: selected.width,
      height: selected.height,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('media.libraryTitle')}</DialogTitle>
          <DialogDescription>{t('media.libraryDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {(currentFolder || folderStack.length > 0) && (
            <Button type="button" variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={t('media.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {currentFolder && (
          <p className="text-xs text-muted-foreground truncate">/{currentFolder}</p>
        )}

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <AlertCircle className="h-10 w-10" />
              <p className="text-sm text-center">{error}</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {folders.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-lg border p-3 hover:bg-accent transition-colors"
                  onClick={() => handleFolderClick(f.name)}
                >
                  <Folder className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs truncate w-full text-center">{f.name}</span>
                </button>
              ))}
              {photos.map((photo) => (
                <button
                  key={photo.itemId}
                  type="button"
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 hover:bg-accent transition-colors ${
                    selected?.itemId === photo.itemId ? 'ring-2 ring-primary bg-accent' : ''
                  }`}
                  onClick={() => setSelected(photo)}
                >
                  <div className="w-full aspect-square bg-muted rounded flex items-center justify-center overflow-hidden">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-xs truncate w-full text-center">{photo.fileName}</span>
                </button>
              ))}
              {!loading && folders.length === 0 && photos.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mb-2" />
                  <p className="text-sm">{t('media.noPhotos')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {selected && (
          <div className="rounded-md border p-3 flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selected.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {selected.width && selected.height && `${selected.width}×${selected.height} — `}
                {(selected.sizeBytes / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('media.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selected}>
            {t('media.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
