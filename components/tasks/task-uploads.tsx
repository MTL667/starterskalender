'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Upload, Paperclip, CheckCircle2 } from 'lucide-react'
import type { StarterTaskUpload } from '@/lib/types'

interface TaskUploadsProps {
  taskId: string
  uploads?: StarterTaskUpload[]
  expectedOutputs?: string[] | null
  canUpload: boolean
  onUploaded?: () => void
}

const VARIANT_LABELS: Record<string, string> = {
  'headshot-raw': 'variantHeadshotRaw',
  'forms-photo': 'variantForms',
  linkedin: 'variantLinkedin',
  signature: 'variantSignature',
}

export function TaskUploads({
  taskId,
  uploads = [],
  expectedOutputs,
  canUpload,
  onUploaded,
}: TaskUploadsProps) {
  const t = useTranslations('tasks')
  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const hasExpected = Array.isArray(expectedOutputs) && expectedOutputs.length > 0
  const uploadsByVariant = new Map<string, StarterTaskUpload[]>()
  for (const up of uploads) {
    const key = up.variant || '__other__'
    const arr = uploadsByVariant.get(key) || []
    arr.push(up)
    uploadsByVariant.set(key, arr)
  }

  async function doUpload(variant: string | null, file: File) {
    setError(null)
    setUploadingVariant(variant || '__other__')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (variant) fd.append('variant', variant)
      const res = await fetch(`/api/tasks/${taskId}/uploads`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      onUploaded?.()
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploadingVariant(null)
    }
  }

  function renderSlot(variant: string | null, label: string) {
    const key = variant || '__other__'
    const items = uploadsByVariant.get(key) || []
    const busy = uploadingVariant === key
    return (
      <div key={key} className="border rounded-md p-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">{label}</span>
          {items.length > 0 && (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {items.length}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          {items.map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="truncate">{u.fileName}</span>
              <span className="ml-auto shrink-0">
                {new Date(u.uploadedAt).toLocaleDateString('nl-BE')}
              </span>
            </div>
          ))}
        </div>
        {canUpload && (
          <div className="mt-2">
            <input
              ref={(el) => { fileRefs.current[key] = el }}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) doUpload(variant, f)
                e.target.value = ''
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRefs.current[key]?.click()}
              className="w-full"
            >
              <Upload className="h-3 w-3 mr-1.5" />
              {busy ? t('uploadingFile') : t('uploadFile')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('uploads')}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{t('uploadInstruction')}</p>
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {hasExpected ? (
          expectedOutputs!.map((variant) => {
            const tKey = VARIANT_LABELS[variant]
            const label = tKey ? t(tKey) : variant
            return renderSlot(variant, label)
          })
        ) : (
          renderSlot(null, t('variantOther'))
        )}
      </div>
    </div>
  )
}
