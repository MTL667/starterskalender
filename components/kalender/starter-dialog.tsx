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
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { Trash2, XCircle } from 'lucide-react'
import { getExperienceText } from '@/lib/experience-utils'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  startDate: string
  isCancelled?: boolean
  cancelledAt?: string | null
  cancelReason?: string | null
  hasExperience?: boolean
  experienceSince?: string | null
  experienceRole?: string | null
  experienceEntity?: string | null
  entity?: {
    id: string
  } | null
}

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface JobRole {
  id: string
  title: string
  entityId: string
  isActive: boolean
}

interface StarterDialogProps {
  open: boolean
  onClose: (refreshData?: boolean) => void
  starter: Starter | null
  entities: Entity[]
  canEdit: boolean
}

export function StarterDialog({ open, onClose, starter, entities, canEdit }: StarterDialogProps) {
  const isEdit = !!starter
  const [loading, setLoading] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [formData, setFormData] = useState({
    name: '',
    language: 'NL',
    entityId: '',
    roleTitle: '',
    region: '',
    via: '',
    notes: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    hasExperience: false,
    experienceSince: '',
    experienceRole: '',
    experienceEntity: '',
  })

  // Laad job roles voor de gekozen entiteit
  useEffect(() => {
    if (formData.entityId) {
      fetch(`/api/job-roles?entityId=${formData.entityId}`)
        .then(res => res.json())
        .then(data => setJobRoles(data.filter((r: JobRole) => r.isActive)))
        .catch(err => console.error('Error loading job roles:', err))
    } else {
      setJobRoles([])
    }
  }, [formData.entityId])

  useEffect(() => {
    if (starter) {
      setFormData({
        name: starter.name,
        language: starter.language || 'NL',
        entityId: starter.entity?.id || '',
        roleTitle: starter.roleTitle || '',
        region: starter.region || '',
        via: starter.via || '',
        notes: starter.notes || '',
        startDate: format(new Date(starter.startDate), 'yyyy-MM-dd'),
        hasExperience: starter.hasExperience || false,
        experienceSince: starter.experienceSince ? format(new Date(starter.experienceSince), 'yyyy-MM-dd') : '',
        experienceRole: starter.experienceRole || '',
        experienceEntity: starter.experienceEntity || '',
      })
    } else {
      setFormData({
        name: '',
        language: 'NL',
        entityId: '',
        roleTitle: '',
        region: '',
        via: '',
        notes: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        hasExperience: false,
        experienceSince: '',
        experienceRole: '',
        experienceEntity: '',
      })
    }
  }, [starter, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Valideer blokkades (alleen bij nieuwe starters of als datum gewijzigd)
      if (!isEdit || formData.startDate !== format(new Date(starter.startDate), 'yyyy-MM-dd')) {
        const validationRes = await fetch('/api/blocked-periods', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: formData.entityId,
            jobRoleTitle: formData.roleTitle,
            startDate: new Date(formData.startDate).toISOString(),
          }),
        })

        const validation = await validationRes.json()
        if (validation.blocked) {
          alert(
            `Deze periode is geblokkeerd!\n\n` +
            `Functie: ${validation.jobRole}\n` +
            `Periode: ${format(new Date(validation.period.startDate), 'dd MMM yyyy')} - ${format(new Date(validation.period.endDate), 'dd MMM yyyy')}\n` +
            `Reden: ${validation.reason || 'Geen reden opgegeven'}`
          )
          setLoading(false)
          return
        }
      }

      const data = {
        name: formData.name,
        language: formData.language,
        entityId: formData.entityId || null,
        roleTitle: formData.roleTitle || null,
        region: formData.region || null,
        via: formData.via || null,
        notes: formData.notes || null,
        startDate: new Date(formData.startDate).toISOString(),
        hasExperience: formData.hasExperience,
        experienceSince: formData.hasExperience && formData.experienceSince 
          ? new Date(formData.experienceSince).toISOString() 
          : null,
        experienceRole: formData.hasExperience ? (formData.experienceRole || null) : null,
        experienceEntity: formData.hasExperience ? (formData.experienceEntity || null) : null,
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
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="language">Taal *</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NL">🇳🇱 Nederlands (NL)</SelectItem>
                  <SelectItem value="FR">🇫🇷 Frans (FR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entityId">Entiteit</Label>
              <Select
                value={formData.entityId || undefined}
                onValueChange={(value) => setFormData({ ...formData, entityId: value, roleTitle: '' })}
                disabled={!canEdit}
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
              {formData.entityId && jobRoles.length > 0 ? (
                <Select
                  value={formData.roleTitle || undefined}
                  onValueChange={(value) => setFormData({ ...formData, roleTitle: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer functie (optioneel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobRoles.map(role => (
                      <SelectItem key={role.id} value={role.title}>
                        {role.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="roleTitle"
                  value={formData.roleTitle}
                  onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                  placeholder={formData.entityId ? 'Geen functies beschikbaar' : 'Selecteer eerst een entiteit'}
                  disabled={!formData.entityId || !canEdit}
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formData.entityId 
                  ? (jobRoles.length > 0 ? 'Kies een functie uit de lijst' : 'Geen functies beschikbaar voor deze entiteit')
                  : 'Selecteer eerst een entiteit om functies te zien'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">Regio</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="via">Via</Label>
                <Input
                  id="via"
                  value={formData.via}
                  onChange={(e) => setFormData({ ...formData, via: e.target.value })}
                  disabled={!canEdit}
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
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="notes">Extra Info</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                disabled={!canEdit}
              />
            </div>

            {/* Ervaring sectie */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="hasExperience"
                  checked={formData.hasExperience}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      hasExperience: checked as boolean,
                      // Reset ervaring velden als uitgevinkt
                      experienceSince: checked ? formData.experienceSince : '',
                      experienceRole: checked ? formData.experienceRole : '',
                      experienceEntity: checked ? formData.experienceEntity : '',
                    })
                  }
                  disabled={!canEdit}
                />
                <Label htmlFor="hasExperience" className="font-medium cursor-pointer">
                  Heeft relevante werkervaring
                </Label>
              </div>

              {formData.hasExperience && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div>
                    <Label htmlFor="experienceSince">
                      Ervaring sinds *
                      {formData.experienceSince && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({getExperienceText(formData.experienceSince)})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="experienceSince"
                      type="date"
                      value={formData.experienceSince}
                      onChange={(e) => setFormData({ ...formData, experienceSince: e.target.value })}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      disabled={!canEdit}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Datum waarop de starter begon met deze functie/ervaring
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="experienceRole">Functie</Label>
                    <Input
                      id="experienceRole"
                      value={formData.experienceRole}
                      onChange={(e) => setFormData({ ...formData, experienceRole: e.target.value })}
                      placeholder="Bijv: Senior Developer, HR Manager, ..."
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label htmlFor="experienceEntity">Bedrijf/Entiteit</Label>
                    <Input
                      id="experienceEntity"
                      value={formData.experienceEntity}
                      onChange={(e) => setFormData({ ...formData, experienceEntity: e.target.value })}
                      placeholder="Bijv: Acme Corp, Consultancy XYZ, ..."
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                {canEdit && isEdit && !starter?.isCancelled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuleren
                  </Button>
                )}
                {canEdit && isEdit && (
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
                  Sluiten
                </Button>
                {canEdit && !starter?.isCancelled && (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Bezig...' : isEdit ? 'Opslaan' : 'Toevoegen'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Cancel Confirmation Dialog */}
    <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Starter Annuleren</DialogTitle>
          <DialogDescription>
            Weet je zeker dat je deze starter wilt annuleren? Er wordt een notificatie verzonden naar alle betrokkenen.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="cancelReason">Reden (optioneel)</Label>
          <Textarea
            id="cancelReason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Bijv: Starter heeft afgezien van de functie"
            rows={3}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={loading}>
            Terug
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? 'Bezig...' : 'Bevestig Annulering'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}

