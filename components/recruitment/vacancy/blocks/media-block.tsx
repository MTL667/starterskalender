'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ImageIcon, X } from 'lucide-react'
import type { MediaContent } from '@/lib/recruitment/types'
import { PhotoLibraryDialog } from '../photo-library-dialog'

interface MediaBlockProps {
  content: MediaContent | null
  editing: boolean
  onChange: (content: MediaContent | null) => void
  vacancyId?: string
  entityId?: string
}

export function MediaBlock({ content, editing, onChange, vacancyId, entityId }: MediaBlockProps) {
  const t = useTranslations('recruitment')
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!content) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-muted-foreground">
        <ImageIcon className="h-8 w-8" />
        <p className="text-sm">{t('media.emptyState')}</p>
        {editing && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <ImageIcon className="h-4 w-4 mr-1.5" />
              {t('media.addImage')}
            </Button>
            <PhotoLibraryDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onSelect={(photo) => {
                onChange(photo)
                setDialogOpen(false)
              }}
              entityId={entityId}
            />
          </>
        )}
      </div>
    )
  }

  const imageUrl = vacancyId
    ? `/api/recruitment/vacancies/${vacancyId}/photo?driveId=${encodeURIComponent(content.driveId)}&itemId=${encodeURIComponent(content.itemId)}`
    : undefined

  return (
    <div className="relative group/media">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={content.fileName}
          className="rounded-md max-h-64 object-contain"
          loading="lazy"
        />
      ) : (
        <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          {content.fileName}
        </div>
      )}
      <div className="mt-1 text-xs text-muted-foreground">
        {content.fileName}
        {content.width && content.height && ` — ${content.width}×${content.height}`}
      </div>
      {editing && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={() => setDialogOpen(true)}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <PhotoLibraryDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSelect={(photo) => {
              onChange(photo)
              setDialogOpen(false)
            }}
            entityId={entityId}
          />
        </div>
      )}
    </div>
  )
}
