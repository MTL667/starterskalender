'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Entity {
  id: string
  name: string
  colorHex: string
  notifyEmails: string[]
  isActive: boolean
}

export default function EntitiesAdminPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    colorHex: '#3b82f6',
    notifyEmails: '',
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
    })
    setDialogOpen(true)
  }

  const handleNew = () => {
    setSelectedEntity(null)
    setFormData({
      name: '',
      colorHex: '#3b82f6',
      notifyEmails: '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const emails = formData.notifyEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e)

    const data = {
      name: formData.name,
      colorHex: formData.colorHex,
      notifyEmails: emails,
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
      alert('Fout bij opslaan')
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar Admin
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entiteiten</CardTitle>
              <CardDescription>Beheer entiteiten en e-mailnotificaties</CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Entiteit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : entities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Geen entiteiten</div>
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
                        {entity.notifyEmails.length} e-mailadres(sen)
                      </div>
                      {entity.notifyEmails.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {entity.notifyEmails.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(entity)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Bewerken
                  </Button>
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
              {selectedEntity ? 'Entiteit Bewerken' : 'Nieuwe Entiteit'}
            </DialogTitle>
            <DialogDescription>
              Configureer de entiteit en e-mailnotificaties
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="colorHex">Kleur *</Label>
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
                <Label htmlFor="notifyEmails">E-mailadressen voor reminders</Label>
                <Input
                  id="notifyEmails"
                  value={formData.notifyEmails}
                  onChange={(e) => setFormData({ ...formData, notifyEmails: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Meerdere adressen gescheiden door komma
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit">
                {selectedEntity ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

