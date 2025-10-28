'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'

export default function BrandingPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogo()
  }, [])

  async function loadLogo() {
    try {
      const response = await fetch('/api/system/settings')
      const settings = await response.json()
      setLogoUrl(settings.logo_url || null)
    } catch (error) {
      console.error('Error loading logo:', error)
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
      setLogoUrl(data.logoUrl)
      alert('Logo succesvol geüpload!')
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert(error instanceof Error ? error.message : 'Fout bij uploaden')
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  async function handleRemoveLogo() {
    if (!confirm('Weet je zeker dat je het logo wilt verwijderen?')) return

    try {
      const response = await fetch('/api/admin/system/logo', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove logo')
      }

      setLogoUrl(null)
      alert('Logo verwijderd!')
    } catch (error) {
      console.error('Error removing logo:', error)
      alert('Fout bij verwijderen')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Branding</h1>
        <p className="text-muted-foreground mt-2">
          Pas het logo en de uitstraling van de applicatie aan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Upload een logo om de &quot;Starterskalender&quot; tekst te vervangen.
            <br />
            Aanbevolen: PNG, SVG, of JPG met transparante achtergrond (max 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          <div>
            <Label>Huidige Logo</Label>
            <div className="mt-2 p-6 border-2 border-dashed rounded-lg bg-muted/30 flex items-center justify-center min-h-[120px]">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="max-h-16 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Geen logo ingesteld</p>
                  <p className="text-sm">De tekst &quot;Starterskalender&quot; wordt getoond</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo-upload">Nieuw Logo Uploaden</Label>
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
                {uploading ? 'Uploaden...' : 'Selecteer'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Toegestane formaten: PNG, JPG, SVG, WebP • Max 2MB
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
                Logo Verwijderen
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Het logo wordt verwijderd en de tekst &quot;Starterskalender&quot; wordt weer getoond.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Styling Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✅ Gebruik een logo met transparante achtergrond voor beste resultaat</p>
          <p>✅ Aanbevolen hoogte: 40-50 pixels (breedte wordt automatisch geschaald)</p>
          <p>✅ SVG formaat geeft de scherpste weergave op alle schermen</p>
          <p>⚠️ Let op: het logo wordt zichtbaar voor alle gebruikers</p>
        </CardContent>
      </Card>
    </div>
  )
}

