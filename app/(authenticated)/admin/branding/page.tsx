'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'

export default function BrandingPage() {
  const t = useTranslations('adminBranding')
  const tc = useTranslations('common')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLogo()
  }, [])

  async function loadLogo() {
    try {
      const response = await fetch('/api/system/settings')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }
      
      const settings = await response.json()
      console.log('Loaded settings:', settings)
      
      // Check if settings has an error property (from API)
      if (settings.error) {
        throw new Error(settings.error)
      }
      
      setLogoUrl(settings.logo_url || null)
      setError(null)
    } catch (error) {
      console.error('Error loading logo:', error)
      setError(error instanceof Error ? error.message : t('errorLoadingLogo'))
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/admin/system/logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      console.log('Upload response:', data)
      setLogoUrl(data.logoUrl)
      setError(null)
      alert(t('logoUploaded'))
    } catch (error) {
      console.error('Error uploading logo:', error)
      const errorMsg = error instanceof Error ? error.message : t('errorUploading')
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  async function handleRemoveLogo() {
    if (!confirm(t('confirmDeleteLogo'))) return

    try {
      const response = await fetch('/api/admin/system/logo', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove logo')
      }

      setLogoUrl(null)
      alert(t('logoDeleted'))
    } catch (error) {
      console.error('Error removing logo:', error)
      alert(tc('errorDeleting'))
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-destructive">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">{t('databaseError')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {error}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>{t('solution')}:</strong> {t('solutionHint')}
                </p>
                <pre className="mt-2 p-3 bg-black/10 rounded text-sm font-mono">
                  npx prisma db push
                </pre>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('dbTableHint')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('logo')}</CardTitle>
          <CardDescription>
            {t('uploadDescription')}
            <br />
            {t('uploadRecommended')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          <div>
            <Label>{t('currentLogo')}</Label>
            <div className="mt-2 p-6 border-2 border-dashed rounded-lg bg-muted/30 flex items-center justify-center min-h-[120px]">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={t('logo')} 
                  className="max-h-16 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('noLogoSet')}</p>
                  <p className="text-sm">{t('textShown')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo-upload">{t('uploadNewLogo')}</Label>
            <div className="flex gap-2">
              <Input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? t('uploading') : t('select')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('allowedFormats')}
            </p>
          </div>

          {/* Remove */}
          {logoUrl && (
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleRemoveLogo}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteLogo')}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                {t('deleteLogoHint')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('stylingTips')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✅ {t('stylingTip1')}</p>
          <p>✅ {t('stylingTip2')}</p>
          <p>✅ {t('stylingTip3')}</p>
          <p>⚠️ {t('stylingTip4')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

