'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { QrCode, Download, X } from 'lucide-react'

interface QrCodeButtonProps {
  vacancyId: string
  isPublished: boolean
}

export function QrCodeButton({ vacancyId, isPublished }: QrCodeButtonProps) {
  const t = useTranslations('recruitment')
  const [open, setOpen] = useState(false)
  const [svg, setSvg] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isPublished) return null

  async function handleOpen() {
    setOpen(true)
    if (svg) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}/qr`)
      if (res.ok) {
        const json = await res.json()
        setSvg(json.data.svg)
        setUrl(json.data.url)
      } else {
        const json = await res.json().catch(() => null)
        const code = json?.error?.code
        if (code === 'NO_SITE_GROUP') {
          setError(t('qrNoSiteGroup'))
        } else {
          setError(t('qrError'))
        }
      }
    } catch {
      setError(t('qrError'))
    }
    setLoading(false)
  }

  function handleDownload() {
    if (!svg) return
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 1024, 1024)
      ctx.drawImage(img, 0, 0, 1024, 1024)
      const link = document.createElement('a')
      link.download = `vacancy-qr-${vacancyId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svg)
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="min-h-[44px]">
        <QrCode className="mr-2 h-4 w-4" />
        {t('qrCode')}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('qrCode')}</h3>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="min-h-[44px] min-w-[44px]">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading && <p className="text-sm text-muted-foreground text-center py-8">{t('qrLoading')}</p>}

            {error && (
              <p className="text-sm text-destructive text-center py-8">{error}</p>
            )}

            {svg && (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-64 h-64 border rounded"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                {url && <p className="text-xs text-muted-foreground text-center break-all">{url}</p>}
                <Button onClick={handleDownload} className="min-h-[44px]">
                  <Download className="mr-2 h-4 w-4" />
                  {t('qrDownload')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
