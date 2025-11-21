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
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Trash2, XCircle, Copy, Check, FileSignature } from 'lucide-react'
import { getExperienceText } from '@/lib/experience-utils'
import { useSession } from 'next-auth/react'
import { SignatureGeneratorDialog } from '@/components/signature-generator-dialog'

interface Starter {
  id: string
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  contractSignedOn?: string | null
  startDate: string
  isCancelled?: boolean
  cancelledAt?: string | null
  cancelReason?: string | null
  hasExperience?: boolean
  experienceSince?: string | null
  experienceRole?: string | null
  experienceEntity?: string | null
  phoneNumber?: string | null
  desiredEmail?: string | null
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
  const { data: session } = useSession()
  const isEdit = !!starter
  const [loading, setLoading] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [starterMaterials, setStarterMaterials] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [isITResponsible, setIsITResponsible] = useState(false)
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    language: 'NL',
    entityId: '',
    roleTitle: '',
    region: '',
    via: '',
    notes: '',
    contractSignedOn: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    hasExperience: false,
    experienceSince: '',
    experienceRole: '',
    experienceEntity: '',
    phoneNumber: '',
    desiredEmail: '',
  })

  // Check if user can edit extra info (notes)
  // Everyone except NONE can edit notes for entities they have access to
  const canEditExtraInfo = (() => {
    if (!session?.user) return false
    if (session.user.role === 'NONE') return false
    
    // HR_ADMIN can edit everything
    if (session.user.role === 'HR_ADMIN') return true
    
    // For other roles, check if they have access to this entity
    if (starter?.entity?.id) {
      const hasAccess = session.user.memberships?.some(
        m => m.entityId === starter.entity?.id
      )
      return hasAccess || false
    }
    
    // For new starters, check if they have access to selected entity
    if (formData.entityId && !isEdit) {
      const hasAccess = session.user.memberships?.some(
        m => m.entityId === formData.entityId
      )
      return hasAccess || false
    }
    
    return false
  })()

  // Check if user can edit contact info (email & phone)
  // Only HR_ADMIN or IT_SETUP responsible can edit these fields
  const canEditContactInfo = (() => {
    if (!session?.user) return false
    
    // HR_ADMIN can always edit
    if (session.user.role === 'HR_ADMIN') return true
    
    // IT_SETUP verantwoordelijke can edit
    return isITResponsible
  })()

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

  // Laad materials voor bestaande starter
  useEffect(() => {
    if (starter?.id) {
      fetch(`/api/starters/${starter.id}/materials`)
        .then(res => res.json())
        .then(data => setStarterMaterials(data))
        .catch(err => console.error('Error loading materials:', err))
    } else {
      setStarterMaterials([])
    }
  }, [starter?.id])

  // Laad taken voor bestaande starter
  useEffect(() => {
    if (starter?.id) {
      fetch(`/api/tasks?starterId=${starter.id}`)
        .then(res => res.json())
        .then(data => setTasks(data || []))
        .catch(err => {
          console.error('Error loading tasks:', err)
          setTasks([])
        })
    } else {
      setTasks([])
    }
  }, [starter?.id])

  // Check of huidige user IT_SETUP verantwoordelijke is voor deze entiteit
  useEffect(() => {
    if (!session?.user?.id) {
      setIsITResponsible(false)
      return
    }

    const entityId = starter?.entity?.id || formData.entityId
    if (!entityId) {
      setIsITResponsible(false)
      return
    }

    // Check via dedicated endpoint
    fetch(`/api/task-assignments/check-responsibility?entityId=${entityId}&taskType=IT_SETUP`)
      .then(res => res.json())
      .then(data => {
        setIsITResponsible(data.isResponsible || false)
      })
      .catch(err => {
        console.error('Error checking IT responsibility:', err)
        setIsITResponsible(false)
      })
  }, [session?.user?.id, starter?.entity?.id, formData.entityId])

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
        contractSignedOn: starter.contractSignedOn ? format(new Date(starter.contractSignedOn), 'yyyy-MM-dd') : '',
        startDate: format(new Date(starter.startDate), 'yyyy-MM-dd'),
        hasExperience: starter.hasExperience || false,
        experienceSince: starter.experienceSince ? format(new Date(starter.experienceSince), 'yyyy-MM-dd') : '',
        experienceRole: starter.experienceRole || '',
        experienceEntity: starter.experienceEntity || '',
        phoneNumber: starter.phoneNumber || '',
        desiredEmail: starter.desiredEmail || '',
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
        contractSignedOn: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        hasExperience: false,
        experienceSince: '',
        experienceRole: '',
        experienceEntity: '',
        phoneNumber: '',
        desiredEmail: '',
      })
    }
  }, [starter, open])

  const handleSaveExtraInfo = async () => {
    if (!isEdit || !starter) return
    
    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: formData.notes || null }),
      })

      if (!res.ok) {
        throw new Error('Failed to save extra info')
      }

      onClose(true)
    } catch (error) {
      console.error('Error saving extra info:', error)
      alert('Fout bij opslaan. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveContactInfo = async () => {
    if (!isEdit || !starter) return
    
    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: formData.phoneNumber || null,
          desiredEmail: formData.desiredEmail || null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save contact info')
      }

      onClose(true)
    } catch (error) {
      console.error('Error saving contact info:', error)
      alert('Fout bij opslaan. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

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
        contractSignedOn: formData.contractSignedOn 
          ? new Date(formData.contractSignedOn).toISOString() 
          : null,
        startDate: new Date(formData.startDate).toISOString(),
        hasExperience: formData.hasExperience,
        experienceSince: formData.hasExperience && formData.experienceSince 
          ? new Date(formData.experienceSince).toISOString() 
          : null,
        experienceRole: formData.hasExperience ? (formData.experienceRole || null) : null,
        experienceEntity: formData.hasExperience ? (formData.experienceEntity || null) : null,
        phoneNumber: formData.phoneNumber || null,
        desiredEmail: formData.desiredEmail || null,
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

      // Als nieuwe starter, wijs automatisch materials toe van de job role
      if (!isEdit && formData.roleTitle && formData.entityId) {
        const starterData = await res.json()
        if (starterData.id) {
          try {
            await fetch(`/api/starters/${starterData.id}/materials`, {
              method: 'POST',
            })
          } catch (materialError) {
            console.error('Error assigning materials:', materialError)
            // Niet fataal, gewoon doorgaan
          }
        }
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

  const handleMaterialToggle = async (materialId: string, isProvided: boolean) => {
    if (!starter) return

    try {
      const res = await fetch(`/api/starters/${starter.id}/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isProvided }),
      })

      if (res.ok) {
        // Reload materials
        const materialsRes = await fetch(`/api/starters/${starter.id}/materials`)
        if (materialsRes.ok) {
          setStarterMaterials(await materialsRes.json())
        }
      }
    } catch (error) {
      console.error('Error toggling material:', error)
      alert('Fout bij bijwerken materiaal')
    }
  }

  const handleCopy = async (field: 'phone' | 'email') => {
    const value = field === 'phone' ? formData.phoneNumber : formData.desiredEmail
    
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      
      // Reset na 2 seconden
      setTimeout(() => {
        setCopiedField(null)
      }, 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert('Kon niet kopiëren naar clipboard')
    }
  }

  // Check of alle velden voor signature generatie ingevuld zijn
  const canGenerateSignature = !!(
    formData.name &&
    formData.roleTitle &&
    formData.phoneNumber &&
    formData.desiredEmail
  )

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contractSignedOn">Contract getekend op</Label>
                <Input
                  id="contractSignedOn"
                  type="date"
                  value={formData.contractSignedOn}
                  onChange={(e) => setFormData({ ...formData, contractSignedOn: e.target.value })}
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optioneel - Datum waarop het contract is ondertekend
                </p>
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
            </div>

            <div>
              <Label htmlFor="notes">
                Extra Info
                {!canEdit && canEditExtraInfo && (
                  <span className="text-xs text-muted-foreground ml-2">(Je kunt dit veld bewerken)</span>
                )}
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                disabled={!canEditExtraInfo}
                placeholder={canEditExtraInfo ? "Voeg extra informatie toe..." : "Geen extra informatie"}
              />
            </div>

            {/* Signature Generator Button */}
            {canGenerateSignature && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FileSignature className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Email Signature Genereren
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Alle contactgegevens zijn ingevuld! Genereer een professionele email signature voor deze starter.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setSignatureDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                      size="sm"
                    >
                      <FileSignature className="h-4 w-4 mr-2" />
                      Genereer Signature
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Contactgegevens */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phoneNumber">
                  Telefoonnummer
                  {!canEditContactInfo && isEdit && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Alleen IT verantwoordelijke)
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+32 123 45 67 89"
                    disabled={!canEditContactInfo}
                    className="flex-1"
                  />
                  {formData.phoneNumber && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy('phone')}
                      className="shrink-0"
                      title="Kopieer telefoonnummer"
                    >
                      {copiedField === 'phone' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.phoneNumber 
                    ? copiedField === 'phone' 
                      ? '✓ Gekopieerd naar clipboard!' 
                      : 'Klik op het icoon om te kopiëren'
                    : 'Optioneel - Kan later worden toegevoegd'}
                </p>
              </div>

              <div>
                <Label htmlFor="desiredEmail">
                  Gewenst E-mailadres
                  {!canEditContactInfo && isEdit && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Alleen IT verantwoordelijke)
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="desiredEmail"
                    type="email"
                    value={formData.desiredEmail}
                    onChange={(e) => setFormData({ ...formData, desiredEmail: e.target.value })}
                    placeholder="voornaam.achternaam@bedrijf.be"
                    disabled={!canEditContactInfo}
                    className="flex-1"
                  />
                  {formData.desiredEmail && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy('email')}
                      className="shrink-0"
                      title="Kopieer emailadres"
                    >
                      {copiedField === 'email' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.desiredEmail 
                    ? copiedField === 'email' 
                      ? '✓ Gekopieerd naar clipboard!' 
                      : 'Klik op het icoon om te kopiëren'
                    : 'Voorgesteld zakelijk mailadres'}
                </p>
              </div>
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

            {/* Materialen sectie (alleen bij edit) */}
            {isEdit && starterMaterials.length > 0 && (
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  Benodigde Materialen
                </Label>
                <div className="space-y-2">
                  {starterMaterials.map((sm: any) => (
                    <div
                      key={sm.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          id={`material-${sm.materialId}`}
                          checked={sm.isProvided}
                          onCheckedChange={(checked) =>
                            handleMaterialToggle(sm.materialId, checked as boolean)
                          }
                          disabled={!canEdit}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`material-${sm.materialId}`}
                            className="cursor-pointer font-normal"
                          >
                            {sm.material.name}
                            {sm.material.category && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {sm.material.category}
                              </Badge>
                            )}
                          </Label>
                          {sm.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {sm.notes}
                            </p>
                          )}
                          {sm.isProvided && sm.providedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ✓ Verstrekt op{' '}
                              {new Date(sm.providedAt).toLocaleDateString('nl-BE', {
                                dateStyle: 'short',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Vink af welke materialen al zijn verstrekt aan de starter
                  </p>
                )}
              </div>
            )}

            {/* Taken sectie (alleen bij edit) */}
            {isEdit && tasks.length > 0 && (
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  Gekoppelde Taken ({tasks.length})
                </Label>
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {task.status === 'COMPLETED' ? (
                            <span className="text-green-500">✓</span>
                          ) : task.priority === 'URGENT' ? (
                            <span className="text-red-500">🚨</span>
                          ) : task.priority === 'HIGH' ? (
                            <span className="text-orange-500">⚠️</span>
                          ) : (
                            <span className="text-blue-500">📋</span>
                          )}
                          <span className={task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}>
                            {task.title}
                          </span>
                        </div>
                        {task.assignedTo && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            Toegewezen aan: {task.assignedTo.name || task.assignedTo.email}
                          </p>
                        )}
                        {task.dueDate && task.status !== 'COMPLETED' && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            Deadline: {new Date(task.dueDate).toLocaleDateString('nl-BE')}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={task.status === 'COMPLETED' ? 'outline' : 'default'}
                        className="text-xs"
                      >
                        {task.status === 'COMPLETED' ? 'Voltooid' :
                         task.status === 'IN_PROGRESS' ? 'Bezig' :
                         task.status === 'BLOCKED' ? 'Geblokkeerd' : 'In wachtrij'}
                      </Badge>
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      ... en {tasks.length - 5} meer taken
                    </p>
                  )}
                </div>
                <a
                  href="/taken"
                  className="text-xs text-primary hover:underline mt-3 block"
                  target="_blank"
                >
                  Bekijk alle taken →
                </a>
              </div>
            )}
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
                {!canEdit && canEditExtraInfo && isEdit && !starter?.isCancelled && (
                  <Button 
                    type="button" 
                    onClick={handleSaveExtraInfo} 
                    disabled={loading}
                  >
                    {loading ? 'Bezig...' : 'Extra Info Opslaan'}
                  </Button>
                )}
                {!canEdit && canEditContactInfo && isEdit && !starter?.isCancelled && (
                  <Button 
                    type="button" 
                    onClick={handleSaveContactInfo} 
                    disabled={loading}
                    variant="secondary"
                  >
                    {loading ? 'Bezig...' : 'Contact Gegevens Opslaan'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Signature Generator Dialog */}
    {canGenerateSignature && (
      <SignatureGeneratorDialog
        open={signatureDialogOpen}
        onClose={() => setSignatureDialogOpen(false)}
        starterData={{
          name: formData.name,
          roleTitle: formData.roleTitle,
          phoneNumber: formData.phoneNumber,
          desiredEmail: formData.desiredEmail,
        }}
      />
    )}

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

