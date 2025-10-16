'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { Trash2, XCircle } from 'lucide-react'

interface Starter {
  id: string
  name: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  startDate: string
  isCancelled?: boolean
  cancelledAt?: string | null
  cancelReason?: string | null
  entity?: {
    id: string
  } | null
}

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface StarterDialogProps {
  open: boolean
  onClose: (refreshData?: boolean) => void
  starter: Starter | null
  entities: Entity[]
}

export function StarterDialog({ open, onClose, starter, entities }: StarterDialogProps) {
  const isEdit = !!starter
  const [loading, setLoading] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    entityId: '',
    roleTitle: '',
    region: '',
    via: '',
    notes: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    if (starter) {
      setFormData({
        name: starter.name,
        entityId: starter.entity?.id || '',
        roleTitle: starter.roleTitle || '',
        region: starter.region || '',
        via: starter.via || '',
        notes: starter.notes || '',
        startDate: format(new Date(starter.startDate), 'yyyy-MM-dd'),
      })
    } else {
      setFormData({
        name: '',
        entityId: '',
        roleTitle: '',
        region: '',
        via: '',
        notes: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
      })
    }
  }, [starter, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        name: formData.name,
        entityId: formData.entityId || null,
        roleTitle: formData.roleTitle || null,
        region: formData.region || null,
        via: formData.via || null,
        notes: formData.notes || null,
        startDate: new Date(formData.startDate).toISOString(),
      }

      const url = isEdit ? `/api/starters/${starter.id}` : '/api/starters'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error('Failed to save starter')
      }

      onClose(true)
    } catch (error) {
      console.error('Error saving starter:', error)
      alert('Fout bij opslaan. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!starter || !confirm('Weet je zeker dat je deze starter wilt verwijderen?')) {
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete starter')
      }

      onClose(true)
    } catch (error) {
      console.error('Error deleting starter:', error)
      alert('Fout bij verwijderen. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!starter) return

    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel starter')
      }

      setCancelDialogOpen(false)
      setCancelReason('')
      onClose(true)
      alert('Starter geannuleerd en notificaties verzonden')
    } catch (error) {
      console.error('Error cancelling starter:', error)
      alert(error instanceof Error ? error.message : 'Fout bij annuleren')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Starter Bewerken' : 'Nieuwe Starter'}
              {starter?.isCancelled && (
                <span className="ml-3 text-sm font-normal text-red-600 dark:text-red-400">
                  (Geannuleerd)
                </span>
              )}
            </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Pas de gegevens van de starter aan.' : 'Voeg een nieuwe starter toe aan de kalender.'}
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
              <Label htmlFor="entityId">Entiteit</Label>
              <Select
                value={formData.entityId || undefined}
                onValueChange={(value) => setFormData({ ...formData, entityId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer entiteit (optioneel)" />
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
              <Label htmlFor="roleTitle">Functie</Label>
              <Input
                id="roleTitle"
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">Regio</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="via">Via</Label>
                <Input
                  id="via"
                  value={formData.via}
                  onChange={(e) => setFormData({ ...formData, via: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="startDate">Startdatum *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Extra Info</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex justify-between w-full">
              <div>
                {isEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose()}
                  disabled={loading}
                >
                  Annuleren
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Bezig...' : isEdit ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

