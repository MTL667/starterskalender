'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'

interface Membership {
  id: string
  entityId: string
  canEdit: boolean
  entity: {
    id: string
    name: string
    colorHex: string
  }
}

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface UserMembershipsDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function UserMembershipsDialog({ open, onClose, userId, userName }: UserMembershipsDialogProps) {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, userId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [membershipsRes, entitiesRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}/memberships`),
        fetch('/api/entities'),
      ])

      if (membershipsRes.ok && entitiesRes.ok) {
        const membershipsData = await membershipsRes.json()
        const entitiesData = await entitiesRes.json()
        setMemberships(membershipsData)
        setEntities(entitiesData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMembership = async () => {
    if (!selectedEntityId) return

    try {
      const res = await fetch(`/api/admin/users/${userId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: selectedEntityId, canEdit }),
      })

      if (res.ok) {
        fetchData()
        setSelectedEntityId('')
        setCanEdit(false)
      } else {
        alert('Fout bij toevoegen membership')
      }
    } catch (error) {
      console.error('Error adding membership:', error)
      alert('Fout bij toevoegen membership')
    }
  }

  const handleDeleteMembership = async (membershipId: string) => {
    if (!confirm('Weet je zeker dat je deze toegang wilt verwijderen?')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}/memberships?membershipId=${membershipId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData()
      } else {
        alert('Fout bij verwijderen membership')
      }
    } catch (error) {
      console.error('Error deleting membership:', error)
      alert('Fout bij verwijderen membership')
    }
  }

  const availableEntities = entities.filter(
    e => !memberships.some(m => m.entityId === e.id)
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Entity Toegang - {userName}</DialogTitle>
          <DialogDescription>
            Beheer tot welke entiteiten deze gebruiker toegang heeft
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bestaande memberships */}
          <div>
            <h3 className="font-medium mb-3">Huidige Toegang</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Laden...</p>
            ) : memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen entity toegang</p>
            ) : (
              <div className="space-y-2">
                {memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: membership.entity.colorHex }}
                      />
                      <span className="font-medium">{membership.entity.name}</span>
                      <Badge variant={membership.canEdit ? 'default' : 'secondary'}>
                        {membership.canEdit ? 'Editor' : 'Viewer'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMembership(membership.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nieuwe membership toevoegen */}
          {availableEntities.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Toegang Toevoegen</h3>
              <div className="flex gap-2">
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecteer entiteit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEntities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={canEdit ? 'editor' : 'viewer'} onValueChange={(v) => setCanEdit(v === 'editor')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleAddMembership} disabled={!selectedEntityId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Toevoegen
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

