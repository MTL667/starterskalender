'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { JobRoleMaterialsDialog } from '@/components/admin/job-role-materials-dialog'

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface JobRole {
  id: string
  entityId: string
  title: string
  description?: string | null
  isActive: boolean
  order: number
  entity: {
    id: string
    name: string
    colorHex: string
  }
}

export default function JobRolesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null)
  const [editingRole, setEditingRole] = useState<JobRole | null>(null)
  const [formData, setFormData] = useState({
    entityId: '',
    title: '',
    description: '',
    isActive: true,
    order: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    Promise.all([
      fetch('/api/entities').then(res => res.json()),
      fetch('/api/job-roles').then(res => res.json()),
    ])
      .then(([entitiesData, jobRolesData]) => {
        setEntities(entitiesData)
        setJobRoles(jobRolesData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading data:', error)
        setLoading(false)
      })
  }

  const handleNew = () => {
    setEditingRole(null)
    setFormData({
      entityId: selectedEntity === 'all' ? '' : selectedEntity,
      title: '',
      description: '',
      isActive: true,
      order: 0,
    })
    setDialogOpen(true)
  }

  const handleEdit = (role: JobRole) => {
    setEditingRole(role)
    setFormData({
      entityId: role.entityId,
      title: role.title,
      description: role.description || '',
      isActive: role.isActive,
      order: role.order,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const url = editingRole ? `/api/job-roles/${editingRole.id}` : '/api/job-roles'
      const method = editingRole ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save')

      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Fout bij opslaan')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze functie wilt verwijderen?')) return

    try {
      const res = await fetch(`/api/job-roles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Fout bij verwijderen')
    }
  }

  const filteredRoles = selectedEntity === 'all'
    ? jobRoles
    : jobRoles.filter(r => r.entityId === selectedEntity)

  // Groepeer per entiteit
  const rolesByEntity = filteredRoles.reduce((acc, role) => {
    if (!acc[role.entityId]) {
      acc[role.entityId] = []
    }
    acc[role.entityId].push(role)
    return acc
  }, {} as Record<string, JobRole[]>)

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Functie Beheer</h1>
        <p className="text-muted-foreground">
          Beheer functies per entiteit
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Functies</CardTitle>
              <CardDescription>Functies gekoppeld aan entiteiten</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle entiteiten</SelectItem>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Functie
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : Object.keys(rolesByEntity).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Geen functies gevonden</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(rolesByEntity).map(([entityId, roles]) => {
                const entity = entities.find(e => e.id === entityId)
                if (!entity) return null

                return (
                  <div key={entityId} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge style={{ backgroundColor: entity.colorHex, color: 'white' }}>
                        {entity.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {roles.length} functie{roles.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {roles.map(role => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{role.title}</span>
                              {!role.isActive && (
                                <Badge variant="secondary">Inactief</Badge>
                              )}
                            </div>
                            {role.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {role.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role)
                                setMaterialsDialogOpen(true)
                              }}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Materialen
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(role)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(role.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for create/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Functie Bewerken' : 'Nieuwe Functie'}
            </DialogTitle>
            <DialogDescription>
              Voeg een functie toe of bewerk een bestaande functie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="entityId">Entiteit *</Label>
              <Select
                value={formData.entityId}
                onValueChange={(value) => setFormData({ ...formData, entityId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer entiteit" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Functietitel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Bijv. Senior Developer"
              />
            </div>
            <div>
              <Label htmlFor="description">Beschrijving (optioneel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Extra informatie over deze functie"
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isActive">Actief</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={!formData.entityId || !formData.title}>
              {editingRole ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Materials Dialog */}
      <JobRoleMaterialsDialog
        open={materialsDialogOpen}
        onClose={() => setMaterialsDialogOpen(false)}
        jobRole={selectedRole}
      />
    </div>
  )
}

