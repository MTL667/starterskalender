'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Package, AlertTriangle, Mail } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { JobRoleMaterialsDialog } from '@/components/admin/job-role-materials-dialog'

interface Entity {
  id: string
  name: string
  colorHex: string
  inspectorNumberEnabled?: boolean
  entraAppConnection?: { consentStatus: string } | null
}

interface JobRole {
  id: string
  entityId: string
  title: string
  description?: string | null
  isActive: boolean
  order: number
  requiresInspectorNumber: boolean
  entity: {
    id: string
    name: string
    colorHex: string
    inspectorNumberEnabled?: boolean
  }
  _count?: {
    materials: number
  }
  licenseConfig?: {
    skuId: string
    skuDisplayName: string
  } | null
}

export default function JobRolesPage() {
  const t = useTranslations('adminJobRoles')
  const tc = useTranslations('common')
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
    requiresInspectorNumber: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    Promise.all([
      fetch('/api/entities?includeEntra=true').then(res => res.ok ? res.json() : []),
      fetch('/api/job-roles?withMaterialCount=true&withLicenseConfig=true').then(res => res.ok ? res.json() : []),
    ])
      .then(([entitiesData, jobRolesData]) => {
        setEntities(Array.isArray(entitiesData) ? entitiesData : [])
        setJobRoles(Array.isArray(jobRolesData) ? jobRolesData : [])
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
      requiresInspectorNumber: false,
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
      requiresInspectorNumber: role.requiresInspectorNumber,
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
      alert(tc('errorSaving'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteRole'))) return

    try {
      const res = await fetch(`/api/job-roles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
      alert(tc('errorDeleting'))
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

  const rolesWithoutMaterials = jobRoles.filter(
    r => r.isActive && r._count && r._count.materials === 0
  )

  const entityHasEntra = (entityId: string) => {
    const entity = entities.find(e => e.id === entityId)
    return entity?.entraAppConnection?.consentStatus === 'healthy'
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {!loading && rolesWithoutMaterials.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">
              {t('rolesWithoutMaterialsWarning', { count: rolesWithoutMaterials.length })}
            </span>
            <span className="block text-sm mt-1">
              {rolesWithoutMaterials.map(r => `${r.title} (${r.entity.name})`).join(', ')}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{t('rolesTitle')}</CardTitle>
              <CardDescription>{t('rolesSubtitle')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allEntities')}</SelectItem>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('newRole')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
          ) : Object.keys(rolesByEntity).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('noRoles')}</div>
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
                        {roles.length} {t('roleCount')}
                      </span>
                      {entityHasEntra(entityId) && (
                        <BulkLicenseSelector
                          entityId={entityId}
                          roleIds={roles.map(r => r.id)}
                          onUpdated={loadData}
                        />
                      )}
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
                                <Badge variant="secondary">{tc('inactive')}</Badge>
                              )}
                              {role.requiresInspectorNumber && (
                                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                                  #
                                </Badge>
                              )}
                              {role.isActive && role._count && role._count.materials === 0 && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t('noMaterials')}
                                </Badge>
                              )}
                            </div>
                            {role.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {role.description}
                              </p>
                            )}
                            {role.entity && entityHasEntra(role.entityId) && (
                              <LicenseTypeSelector
                                jobRoleId={role.id}
                                entityId={role.entityId}
                                currentSkuId={role.licenseConfig?.skuId || null}
                                currentDisplayName={role.licenseConfig?.skuDisplayName || null}
                                onUpdated={loadData}
                              />
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
                              {t('materials')}
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
              {editingRole ? t('editRole') : t('newRoleTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('addOrEditRole')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="entityId">{t('entityRequired')}</Label>
              <Select
                value={formData.entityId}
                onValueChange={(value) => setFormData({ ...formData, entityId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectEntity')} />
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
            {(() => {
              const ent = entities.find(e => e.id === formData.entityId)
              return ent?.inspectorNumberEnabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresInspectorNumber"
                    checked={formData.requiresInspectorNumber}
                    onChange={(e) => setFormData({ ...formData, requiresInspectorNumber: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="requiresInspectorNumber">Vereist inspecteurnummer</Label>
                </div>
              ) : null
            })()}
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

function LicenseTypeSelector({ jobRoleId, entityId, currentSkuId, currentDisplayName, onUpdated }: {
  jobRoleId: string
  entityId: string
  currentSkuId: string | null
  currentDisplayName: string | null
  onUpdated: () => void
}) {
  const [value, setValue] = useState(currentSkuId || '')
  const [saving, setSaving] = useState(false)
  const [skus, setSkus] = useState<{ skuId: string; displayName: string; availableUnits: number; totalUnits: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setValue(currentSkuId || '')
  }, [currentSkuId])

  const loadSkus = async () => {
    if (skus.length > 0 && !error) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/admin/available-skus/${entityId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSkus(data.skus || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = async (newValue: string) => {
    setSaving(true)
    try {
      if (newValue === 'none') {
        const res = await fetch(`/api/admin/license-config/${jobRoleId}`, { method: 'DELETE' })
        if (res.ok) setValue('')
      } else {
        const sku = skus.find(s => s.skuId === newValue)
        const res = await fetch(`/api/admin/license-config/${jobRoleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skuId: newValue, skuDisplayName: sku?.displayName || newValue }),
        })
        if (res.ok) setValue(newValue)
      }
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={value || 'none'} onValueChange={handleChange} onOpenChange={(isOpen) => { if (isOpen) loadSkus() }}>
        <SelectTrigger className="h-7 w-[220px] text-xs">
          <SelectValue placeholder="Geen licentie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Geen licentie</SelectItem>
          {value && value !== 'none' && !skus.find(s => s.skuId === value) && (
            <SelectItem value={value}>{currentDisplayName || value}</SelectItem>
          )}
          {loading && <SelectItem value="__loading" disabled>Laden...</SelectItem>}
          {error && <SelectItem value="__error" disabled>Fout bij laden</SelectItem>}
          {skus.map(sku => (
            <SelectItem key={sku.skuId} value={sku.skuId}>
              <span>{sku.displayName}</span>
              <span className="ml-2 text-muted-foreground">({sku.availableUnits}/{sku.totalUnits})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <span className="text-xs text-muted-foreground">...</span>}
    </div>
  )
}

function BulkLicenseSelector({ entityId, roleIds, onUpdated }: {
  entityId: string
  roleIds: string[]
  onUpdated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [skus, setSkus] = useState<{ skuId: string; displayName: string; availableUnits: number; totalUnits: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const loadSkus = async () => {
    if (skus.length > 0 && !error) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/admin/available-skus/${entityId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSkus(data.skus || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = async (newValue: string) => {
    if (newValue === '__placeholder') return
    setSaving(true)
    let successCount = 0
    try {
      const sku = skus.find(s => s.skuId === newValue)
      for (const roleId of roleIds) {
        try {
          let res: Response
          if (newValue === 'none') {
            res = await fetch(`/api/admin/license-config/${roleId}`, { method: 'DELETE' })
          } else {
            res = await fetch(`/api/admin/license-config/${roleId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ skuId: newValue, skuDisplayName: sku?.displayName || newValue }),
            })
          }
          if (res.ok) {
            successCount++
          } else {
            const body = await res.json().catch(() => ({}))
            console.error(`License config update failed for role ${roleId}:`, res.status, body)
          }
        } catch (err) {
          console.error(`Failed to update license for role ${roleId}:`, err)
        }
      }
      console.log(`Bulk license update: ${successCount}/${roleIds.length} succeeded`)
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 ml-auto">
      <Select value="__placeholder" onValueChange={handleChange} onOpenChange={(isOpen) => { if (isOpen) loadSkus() }}>
        <SelectTrigger className="h-7 w-[200px] text-xs">
          <SelectValue placeholder="Alle rollen instellen..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__placeholder" disabled>Alle rollen instellen...</SelectItem>
          <SelectItem value="none">Geen licentie</SelectItem>
          {loading && <SelectItem value="__loading" disabled>Laden...</SelectItem>}
          {error && <SelectItem value="__error" disabled>Fout bij laden</SelectItem>}
          {skus.map(sku => (
            <SelectItem key={sku.skuId} value={sku.skuId}>
              <span>{sku.displayName}</span>
              <span className="ml-2 text-muted-foreground">({sku.availableUnits}/{sku.totalUnits})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <span className="text-xs text-muted-foreground">Opslaan...</span>}
    </div>
  )
}

