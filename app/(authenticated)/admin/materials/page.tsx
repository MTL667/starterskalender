'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react'
import Link from 'next/link'

interface Material {
  id: string
  name: string
  description: string | null
  category: string | null
  isActive: boolean
  order: number
  _count: {
    jobRoles: number
    starterMaterials: number
  }
}

const CATEGORIES = ['Hardware', 'Software', 'Toegang', 'Documentatie', 'Overig']

export default function MaterialsAdminPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMaterial, setEditMaterial] = useState<Material | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    isActive: true,
    order: 0,
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials')
      if (res.ok) {
        const data = await res.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editMaterial ? `/api/materials/${editMaterial.id}` : '/api/materials'
      const method = editMaterial ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchMaterials()
        setDialogOpen(false)
        resetForm()
      } else {
        const error = await res.json()
        alert(error.error || 'Er is een fout opgetreden')
      }
    } catch (error) {
      console.error('Error saving material:', error)
      alert('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (material: Material) => {
    setEditMaterial(material)
    setFormData({
      name: material.name,
      description: material.description || '',
      category: material.category || '',
      isActive: material.isActive,
      order: material.order,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit materiaal wilt verwijderen?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchMaterials()
      } else {
        const error = await res.json()
        alert(error.error || 'Kan materiaal niet verwijderen')
      }
    } catch (error) {
      console.error('Error deleting material:', error)
      alert('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditMaterial(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      isActive: true,
      order: 0,
    })
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar Admin
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Materialenbeheer</h1>
        <p className="text-muted-foreground">
          Beheer materialen die toegewezen kunnen worden aan functies en starters
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Materialen</CardTitle>
              <CardDescription>
                Hardware, software, toegangspassen en andere benodigde materialen
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Materiaal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nog geen materialen. Klik op "Nieuw Materiaal" om te beginnen.
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{material.name}</p>
                        {material.category && (
                          <Badge variant="outline">{material.category}</Badge>
                        )}
                        {!material.isActive && (
                          <Badge variant="secondary">Inactief</Badge>
                        )}
                      </div>
                      {material.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {material.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{material._count.jobRoles} functies</span>
                        <span>{material._count.starterMaterials} starters</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(material)}
                    >
                      Bewerken
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(material.id)}
                      disabled={material._count.jobRoles > 0 || material._count.starterMaterials > 0}
                      title={
                        material._count.jobRoles > 0 || material._count.starterMaterials > 0
                          ? 'Kan niet verwijderen: in gebruik'
                          : 'Verwijderen'
                      }
                    >
                      <Trash2 className="h-4 w-4" />
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
              {editMaterial ? 'Materiaal Bewerken' : 'Nieuw Materiaal'}
            </DialogTitle>
            <DialogDescription>
              Vul de gegevens van het materiaal in
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bijv: Laptop, Telefoon, Badge"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Categorie</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Geen categorie</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="description">Beschrijving</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optionele beschrijving..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="order">Sorteervolgorde</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Actief</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Bezig...' : editMaterial ? 'Opslaan' : 'Toevoegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

