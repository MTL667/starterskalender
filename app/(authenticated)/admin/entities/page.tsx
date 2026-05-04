'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'

interface Entity {
  id: string
  name: string
  colorHex: string
  notifyEmails: string[]
  isActive: boolean
  inspectorNumberEnabled: boolean
  inspectorNumberStart: number
  inspectorNumberLabel: string
}

export default function EntitiesAdminPage() {
  const t = useTranslations('adminEntities')
  const tc = useTranslations('common')
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importEntityId, setImportEntityId] = useState<string>('')
  const [importResult, setImportResult] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    colorHex: '#3b82f6',
    notifyEmails: '',
    inspectorNumberEnabled: false,
    inspectorNumberStart: 1,
    inspectorNumberLabel: 'Inspecteurnummer',
  })

  useEffect(() => {
    fetchEntities()
  }, [])

  const fetchEntities = async () => {
    try {
      const res = await fetch('/api/entities')
      const data = await res.json()
      setEntities(data)
    } catch (error) {
      console.error('Error fetching entities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (entity: Entity) => {
    setSelectedEntity(entity)
    setFormData({
      name: entity.name,
      colorHex: entity.colorHex,
      notifyEmails: entity.notifyEmails.join(', '),
      inspectorNumberEnabled: entity.inspectorNumberEnabled,
      inspectorNumberStart: entity.inspectorNumberStart,
      inspectorNumberLabel: entity.inspectorNumberLabel,
    })
    setDialogOpen(true)
  }

  const handleNew = () => {
    setSelectedEntity(null)
    setFormData({
      name: '',
      colorHex: '#3b82f6',
      notifyEmails: '',
      inspectorNumberEnabled: false,
      inspectorNumberStart: 1,
      inspectorNumberLabel: 'Inspecteurnummer',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const emails = formData.notifyEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e)

    const data: any = {
      name: formData.name,
      colorHex: formData.colorHex,
      notifyEmails: emails,
      inspectorNumberEnabled: formData.inspectorNumberEnabled,
      inspectorNumberStart: formData.inspectorNumberStart,
      inspectorNumberLabel: formData.inspectorNumberLabel,
    }

    try {
      const url = selectedEntity ? `/api/entities/${selectedEntity.id}` : '/api/entities'
      const method = selectedEntity ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to save entity')

      setDialogOpen(false)
      fetchEntities()
    } catch (error) {
      console.error('Error saving entity:', error)
      alert(tc('errorSaving'))
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !importEntityId) return

    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        setImportResult({ error: 'CSV moet minstens een header en één rij bevatten' })
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      const fnIdx = headers.findIndex(h => h === 'firstname' || h === 'voornaam')
      const lnIdx = headers.findIndex(h => h === 'lastname' || h === 'achternaam')
      const numIdx = headers.findIndex(h => h === 'inspectornumber' || h === 'inspecteurnummer' || h === 'nummer')

      if (fnIdx === -1 || lnIdx === -1 || numIdx === -1) {
        setImportResult({ error: 'CSV headers moeten firstName/voornaam, lastName/achternaam en inspectorNumber/inspecteurnummer/nummer bevatten' })
        return
      }

      const rows = lines.slice(1).filter(l => l.trim()).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
        return {
          firstName: cols[fnIdx],
          lastName: cols[lnIdx],
          inspectorNumber: parseInt(cols[numIdx]),
        }
      })

      const res = await fetch(`/api/entities/${importEntityId}/import-inspector-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })

      const result = await res.json()
      setImportResult(result)
    } catch (err) {
      setImportResult({ error: 'Fout bij verwerken van bestand' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('backToAdmin')}
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('subtitle')}</CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t('newEntity')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
          ) : entities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('noEntities')}</div>
          ) : (
            <div className="space-y-4">
              {entities.map(entity => (
                <div
                  key={entity.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: entity.colorHex }}
                    />
                    <div>
                      <div className="font-semibold">{entity.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {entity.notifyEmails.length} {t('emailCount')}
                      </div>
                      {entity.notifyEmails.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {entity.notifyEmails.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {entity.inspectorNumberEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImportEntityId(entity.id)
                          setImportResult(null)
                          setImportDialogOpen(true)
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(entity)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc('edit')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEntity ? t('editEntity') : t('newEntityTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('configureEntity')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{tc('name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="colorHex">{t('colorRequired')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="colorHex"
                    type="color"
                    value={formData.colorHex}
                    onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                    className="w-20"
                    required
                  />
                  <Input
                    value={formData.colorHex}
                    onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notifyEmails">{t('emailsForReminders')}</Label>
                <Input
                  id="notifyEmails"
                  value={formData.notifyEmails}
                  onChange={(e) => setFormData({ ...formData, notifyEmails: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {t('multipleEmails')}
                </p>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="inspectorNumberEnabled"
                    checked={formData.inspectorNumberEnabled}
                    onChange={(e) => setFormData({ ...formData, inspectorNumberEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="inspectorNumberEnabled">Inspecteurnummer activeren</Label>
                </div>
                {formData.inspectorNumberEnabled && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <Label htmlFor="inspectorNumberLabel">Label</Label>
                      <Input
                        id="inspectorNumberLabel"
                        value={formData.inspectorNumberLabel}
                        onChange={(e) => setFormData({ ...formData, inspectorNumberLabel: e.target.value })}
                        placeholder="Inspecteurnummer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="inspectorNumberStart">Startnummer</Label>
                      <Input
                        id="inspectorNumberStart"
                        type="number"
                        min={1}
                        value={formData.inspectorNumberStart}
                        onChange={(e) => setFormData({ ...formData, inspectorNumberStart: parseInt(e.target.value) || 1 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Nummers worden automatisch opeenvolgend toegekend vanaf dit startnummer.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button type="submit">
                {selectedEntity ? tc('save') : tc('add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inspecteurnummers importeren</DialogTitle>
            <DialogDescription>
              Upload een CSV-bestand met kolommen: voornaam, achternaam, nummer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">CSV formaat:</p>
              <code className="block bg-muted p-2 rounded text-xs">
                voornaam,achternaam,nummer<br />
                Jan,Janssens,1001<br />
                Piet,Pieters,1002
              </code>
            </div>
            <Input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              disabled={importing}
            />
            {importing && <p className="text-sm text-muted-foreground">Importeren...</p>}
            {importResult && !importResult.error && (
              <div className="text-sm space-y-1">
                <p className="text-green-600 font-medium">{importResult.imported} van {importResult.total} geïmporteerd</p>
                {importResult.errors?.length > 0 && (
                  <div className="text-red-600 max-h-40 overflow-y-auto">
                    {importResult.errors.map((e: any) => (
                      <p key={e.row}>Rij {e.row}: {e.error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {importResult?.error && (
              <p className="text-sm text-red-600">{importResult.error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

