'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface CertificateDownloadProps {
  entityId: string
}

export function CertificateDownload({ entityId }: CertificateDownloadProps) {
  const t = useTranslations('entra')

  async function handleDownload() {
    const response = await fetch(`/api/admin/entra-connection/${entityId}/certificate`)
    if (!response.ok) return

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entra-${entityId}.cer`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      {t('certificate.download')}
    </Button>
  )
}
