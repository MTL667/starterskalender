'use client'

import { useTranslations } from 'next-intl'
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

const CATEGORY_KEYS = ['hardware', 'software', 'access', 'documentation', 'other'] as const

const CATEGORY_TRANSLATION_KEYS: Record<string, 'categoryHardware' | 'categorySoftware' | 'categoryAccess' | 'categoryDocumentation' | 'categoryOther'> = {
  Hardware: 'categoryHardware', hardware: 'categoryHardware',
  Software: 'categorySoftware', software: 'categorySoftware',
  Toegang: 'categoryAccess', Access: 'categoryAccess', access: 'categoryAccess',
  Documentatie: 'categoryDocumentation', Documentation: 'categoryDocumentation', documentation: 'categoryDocumentation',
  Overig: 'categoryOther', Other: 'categoryOther', other: 'categoryOther',
}
const CATEGORY_TO_VALUE: Record<string, string> = {
  Hardware: 'hardware', hardware: 'hardware',
  Software: 'software', software: 'software',
  Toegang: 'access', Access: 'access', access: 'access',
  Documentatie: 'documentation', Documentation: 'documentation', documentation: 'documentation',
  Overig: 'other', Other: 'other', other: 'other',
}

export default function MaterialsAdminPage() {
  const t = useTranslations('adminMaterials')
  const tc = useTranslations('common')
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
        alert(error.error || tc('error'))
      }
    } catch (error) {
      console.error('Error saving material:', error)
      alert(tc('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (material: Material) => {
    setEditMaterial(material)
    setFormData({
      name: material.name,
      description: material.description || '',
      category: (material.category && CATEGORY_TO_VALUE[material.category]) ? CATEGORY_TO_VALUE[material.category] : (material.category || ''),
      isActive: material.isActive,
      order: material.order,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteMaterial'))) return

    setLoading(true)
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchMaterials()
      } else {
        const error = await res.json()
        alert(error.error || t('cannotDeleteMaterial'))
      }
    } catch (error) {
      console.error('Error deleting material:', error)
      alert(tc('error'))
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
            {tc('backToAdmin')}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('materialsTitle')}</CardTitle>
              <CardDescription>
                {t('materialsSubtitle')}
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('newMaterial')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noMaterials')}
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
                          <Badge variant="secondary">{tc('inactive')}</Badge>
                        )}
                      </div>
                      {material.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {material.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{material._count.jobRoles} {t('roles')}</span>
                        <span>{material._count.starterMaterials} {t('startersLabel')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(material)}
                    >
                      {tc('edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(material.id)}
                      disabled={material._count.jobRoles > 0 || material._count.starterMaterials > 0}
                      title={
                        material._count.jobRoles > 0 || material._count.starterMaterials > 0
                          ? t('cannotDelete')
                          : tc('delete')
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
              {editMaterial ? t('editMaterial') : t('newMaterialTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('fillDetails')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">{tc('name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('namePlaceholder')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">{t('category')}</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">{t('noCategory')}</option>
                  {CATEGORY_KEYS.map(cat => (
                    <option key={cat} value={cat}>{t(`category${cat.charAt(0).toUpperCase() + cat.slice(1)}` as 'categoryHardware' | 'categorySoftware' | 'categoryAccess' | 'categoryDocumentation' | 'categoryOther')}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="description">{tc('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="order">{tc('sortOrder')}</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">{tc('active')}</Label>
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
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tc('saving') : editMaterial ? tc('save') : tc('add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

