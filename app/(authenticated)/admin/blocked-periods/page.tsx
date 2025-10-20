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
import { Plus, Trash2, Calendar, X } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface JobRole {
  id: string
  entityId: string
  title: string
}

interface BlockedPeriod {
  id: string
  entityId: string
  jobRoleId?: string | null
  startDate: string
  endDate: string
  reason?: string | null
  entity: {
    id: string
    name: string
    colorHex: string
  }
  jobRole?: {
    id: string
    title: string
  } | null
}

export default function BlockedPeriodsPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [allJobRoles, setAllJobRoles] = useState<JobRole[]>([])
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<{
    entityId: string
    jobRoleId: string | undefined
    startDate: string
    endDate: string
    reason: string
  }>({
    entityId: '',
    jobRoleId: undefined,
    startDate: '',
    endDate: '',
    reason: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    Promise.all([
      fetch('/api/entities').then(res => res.json()),
      fetch('/api/job-roles').then(res => res.json()),
      fetch('/api/blocked-periods').then(res => res.json()),
    ])
      .then(([entitiesData, jobRolesData, blockedPeriodsData]) => {
        setEntities(entitiesData)
        setAllJobRoles(jobRolesData)
        setBlockedPeriods(blockedPeriodsData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading data:', error)
        setLoading(false)
      })
  }

  const handleNew = () => {
    setFormData({
      entityId: '',
      jobRoleId: undefined,
      startDate: '',
      endDate: '',
      reason: '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        jobRoleId: formData.jobRoleId || null,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      }

      const res = await fetch('/api/blocked-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
      alert(error instanceof Error ? error.message : 'Fout bij opslaan')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze blokkade wilt verwijderen?')) return

    try {
      const res = await fetch(`/api/blocked-periods/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Fout bij verwijderen')
    }
  }

  // Filter job roles voor gekozen entiteit
  const availableJobRoles = formData.entityId
    ? allJobRoles.filter(r => r.entityId === formData.entityId)
    : []

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Periode Blokkades</h1>
        <p className="text-muted-foreground">
          Blokkeer periodes waarin bepaalde functies niet geregistreerd kunnen worden
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Geblokkeerde Periodes</CardTitle>
              <CardDescription>Beheer blokkades voor entiteiten en functies</CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Blokkade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Laden...</div>
          ) : blockedPeriods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Geen blokkades gevonden</div>
          ) : (
            <div className="space-y-3">
              {blockedPeriods.map(period => (
                <div
                  key={period.id}
                  className="border rounded-lg p-4 hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge style={{ backgroundColor: period.entity.colorHex, color: 'white' }}>
                          {period.entity.name}
                        </Badge>
                        {period.jobRole ? (
                          <Badge variant="outline">{period.jobRole.title}</Badge>
                        ) : (
                          <Badge variant="secondary">Alle functies</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(period.startDate), 'dd MMM yyyy', { locale: nl })}
                          {' → '}
                          {format(new Date(period.endDate), 'dd MMM yyyy', { locale: nl })}
                        </span>
                      </div>
                      {period.reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Reden:</span> {period.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(period.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for create */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe Blokkade</DialogTitle>
            <DialogDescription>
              Blokkeer een periode voor een entiteit en optioneel een specifieke functie
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="entityId">Entiteit *</Label>
              <Select
                value={formData.entityId}
                onValueChange={(value) => setFormData({ ...formData, entityId: value, jobRoleId: undefined })}
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
              <Label htmlFor="jobRoleId">Functie (optioneel)</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.jobRoleId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, jobRoleId: value })}
                  disabled={!formData.entityId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Alle functies" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableJobRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.jobRoleId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData({ ...formData, jobRoleId: undefined })}
                    title="Selectie wissen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.jobRoleId 
                  ? 'Klik op X om alle functies te blokkeren'
                  : 'Selecteer een functie of laat leeg om alle functies te blokkeren'}
              </p>
            </div>

            <div>
              <Label htmlFor="startDate">Startdatum *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="endDate">Einddatum *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="reason">Reden (optioneel)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                placeholder="Bijv: Wervingsstop, Reorganisatie, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.entityId || !formData.startDate || !formData.endDate}
            >
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

