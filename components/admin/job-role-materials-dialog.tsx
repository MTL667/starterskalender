'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Package } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface Material {
  id: string
  name: string
  category: string | null
}

interface JobRoleMaterial {
  id: string
  materialId: string
  isRequired: boolean
  notes: string | null
  material: Material
}

interface JobRoleMaterialsDialogProps {
  open: boolean
  onClose: () => void
  jobRole: {
    id: string
    title: string
  } | null
}

export function JobRoleMaterialsDialog({ open, onClose, jobRole }: JobRoleMaterialsDialogProps) {
  const t = useTranslations('jobRoleMaterials')
  const tCommon = useTranslations('common')
  const [materials, setMaterials] = useState<Material[]>([])
  const [assignedMaterials, setAssignedMaterials] = useState<JobRoleMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newMaterial, setNewMaterial] = useState({
    materialId: '',
    isRequired: true,
    notes: '',
  })

  useEffect(() => {
    if (open && jobRole) {
      loadData()
    }
  }, [open, jobRole])

  const loadData = async () => {
    if (!jobRole) return

    setLoading(true)
    try {
      const [materialsRes, assignedRes] = await Promise.all([
        fetch('/api/materials?activeOnly=true'),
        fetch(`/api/job-roles/${jobRole.id}/materials`),
      ])

      if (materialsRes.ok) setMaterials(await materialsRes.json())
      if (assignedRes.ok) setAssignedMaterials(await assignedRes.json())
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!jobRole || !newMaterial.materialId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/job-roles/${jobRole.id}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial),
      })

      if (res.ok) {
        await loadData()
        setNewMaterial({ materialId: '', isRequired: true, notes: '' })
        setAdding(false)
      } else {
        const error = await res.json()
        alert(error.error || t('errorAdding'))
      }
    } catch (error) {
      console.error('Error adding material:', error)
      alert(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (materialId: string) => {
    if (!jobRole || !confirm('Weet je zeker dat je dit materiaal wilt verwijderen?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/job-roles/${jobRole.id}/materials/${materialId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadData()
      } else {
        alert('Fout bij verwijderen')
      }
    } catch (error) {
      console.error('Error removing material:', error)
      alert('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const availableMaterials = materials.filter(
    m => !assignedMaterials.some(am => am.materialId === m.id)
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Benodigde Materialen - {jobRole?.title}</DialogTitle>
          <DialogDescription>
            Beheer welke materialen nodig zijn voor deze functie
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assigned Materials */}
          {assignedMaterials.length > 0 && (
            <div>
              <Label className="mb-2 block">Toegewezen Materialen</Label>
              <div className="space-y-2">
                {assignedMaterials.map((jrm) => (
                  <div
                    key={jrm.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{jrm.material.name}</span>
                          {jrm.material.category && (
                            <Badge variant="outline" className="text-xs">
                              {jrm.material.category}
                            </Badge>
                          )}
                          {jrm.isRequired && (
                            <Badge className="text-xs">{t('requiredBadge')}</Badge>
                          )}
                        </div>
                        {jrm.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {jrm.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(jrm.materialId)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Material */}
          {!adding && availableMaterials.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setAdding(true)}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addMaterial')}
            </Button>
          )}

          {adding && (
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <Label htmlFor="material">{t('materialRequired')}</Label>
                <Select
                  value={newMaterial.materialId}
                  onValueChange={(value) =>
                    setNewMaterial({ ...newMaterial, materialId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectMaterial')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                        {material.category && ` (${material.category})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRequired"
                  checked={newMaterial.isRequired}
                  onCheckedChange={(checked) =>
                    setNewMaterial({ ...newMaterial, isRequired: checked as boolean })
                  }
                />
                <Label htmlFor="isRequired" className="cursor-pointer">
                  {t('requiredForRole')}
                </Label>
              </div>

              <div>
                <Label htmlFor="notes">{t('notesOptional')}</Label>
                <Textarea
                  id="notes"
                  value={newMaterial.notes}
                  onChange={(e) =>
                    setNewMaterial({ ...newMaterial, notes: e.target.value })
                  }
                  placeholder={t('notesPlaceholder')}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAdd}
                  disabled={loading || !newMaterial.materialId}
                >
                  {tCommon('add')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAdding(false)
                    setNewMaterial({ materialId: '', isRequired: true, notes: '' })
                  }}
                  disabled={loading}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            </div>
          )}

          {availableMaterials.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('allAssigned')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

