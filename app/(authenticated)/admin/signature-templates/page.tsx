'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileSignature, Save, Trash2, AlertCircle } from 'lucide-react'
import { SignatureBuilder } from '@/components/signature-builder'

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface SignatureTemplate {
  id: string
  entityId: string
  name: string
  htmlTemplate: string
  isActive: boolean
  entity: Entity
}

export default function SignatureTemplatesPage() {
  const t = useTranslations('adminSignatures')
  const tc = useTranslations('common')
  const tAdmin = useTranslations('admin')
  const [entities, setEntities] = useState<Entity[]>([])
  const [templates, setTemplates] = useState<SignatureTemplate[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const [templateName, setTemplateName] = useState('')
  const [htmlTemplate, setHtmlTemplate] = useState('')
  const [builderConfig, setBuilderConfig] = useState<any>(null)
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEntities()
    fetchTemplates()
  }, [])

  const fetchEntities = async () => {
    try {
      const res = await fetch('/api/entities')
      if (res.ok) {
        setEntities(await res.json())
      }
    } catch (error) {
      console.error('Error fetching entities:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/signature-templates')
      if (res.ok) {
        setTemplates(await res.json())
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleEntityChange = (entityId: string) => {
    setSelectedEntityId(entityId)
    
    // Check if template exists for this entity
    const existing = templates.find(t => t.entityId === entityId)
    if (existing) {
      setExistingTemplateId(existing.id)
      setTemplateName(existing.name)
      setHtmlTemplate(existing.htmlTemplate)
      // Try to parse config if stored
      try {
        const stored = localStorage.getItem(`signature-config-${entityId}`)
        if (stored) {
          setBuilderConfig(JSON.parse(stored))
        } else {
          setBuilderConfig(null)
        }
      } catch (e) {
        setBuilderConfig(null)
      }
    } else {
      setExistingTemplateId(null)
      setTemplateName('')
      setHtmlTemplate('')
      setBuilderConfig(null)
    }
  }

  const handleBuilderChange = (html: string, config: any) => {
    setHtmlTemplate(html)
    setBuilderConfig(config)
    // Store config for this entity
    if (selectedEntityId) {
      try {
        localStorage.setItem(`signature-config-${selectedEntityId}`, JSON.stringify(config))
      } catch (e) {
        console.error('Error saving config:', e)
      }
    }
  }

  const handleSave = async () => {
    if (!selectedEntityId || !templateName || !htmlTemplate) {
      alert(t('fillAllFields'))
      return
    }

    setLoading(true)

    try {
      const data = {
        entityId: selectedEntityId,
        name: templateName,
        htmlTemplate,
        isActive: true,
      }

      let res
      if (existingTemplateId) {
        // Update existing
        res = await fetch(`/api/signature-templates/${existingTemplateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: templateName, htmlTemplate }),
        })
      } else {
        // Create new
        res = await fetch('/api/signature-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      if (res.ok) {
        alert(t('templateSaved'))
        fetchTemplates()
      } else {
        const error = await res.json()
        alert(`${tc('error')}: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert(tc('errorSaving'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingTemplateId) return
    
    if (!confirm(t('confirmDeleteTemplate'))) return

    setLoading(true)

    try {
      const res = await fetch(`/api/signature-templates/${existingTemplateId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert(t('templateDeleted'))
        setExistingTemplateId(null)
        setTemplateName('')
        setHtmlTemplate('')
        fetchTemplates()
      } else {
        alert(tc('errorDeleting'))
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert(tc('errorDeleting'))
    } finally {
      setLoading(false)
    }
  }

  const selectedEntity = entities.find(e => e.id === selectedEntityId)

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{tAdmin('signatureTemplates')}</h1>
        <p className="text-muted-foreground">
          {tAdmin('signatureTemplatesDescription')}
        </p>
      </div>

      {!selectedEntityId ? (
        <Card className="p-12 text-center">
          <FileSignature className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{t('selectEntity')}</h3>
          <p className="text-muted-foreground mb-6">
            {t('selectEntityDescription')}
          </p>
          <Select value={selectedEntityId} onValueChange={handleEntityChange}>
            <SelectTrigger className="max-w-md mx-auto">
              <SelectValue placeholder={t('selectEntityPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {entities.map(entity => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.name}
                  {templates.find(t => t.entityId === entity.id) && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {t('hasTemplate')}
                    </Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Entity & Name */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  {selectedEntity?.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {existingTemplateId ? t('editExisting') : t('createNew')}
                </p>
              </div>
              <Button variant="outline" onClick={() => setSelectedEntityId('')}>
                {t('changeEntity')}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('templateName')}</Label>
                <Input
                  id="name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t('templateNamePlaceholder')}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {existingTemplateId ? tc('save') : tc('save')}
                </Button>
                {existingTemplateId && (
                  <Button 
                    onClick={handleDelete} 
                    disabled={loading}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tc('delete')}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Visual Builder */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold mb-1">{t('visualBuilder')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('visualBuilderDescription')}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    {t('dynamicPlaceholders')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {t('dynamicPlaceholdersDescription')}
                  </p>
                </div>
              </div>
            </div>
            <SignatureBuilder 
              initialConfig={builderConfig}
              onChange={handleBuilderChange}
            />
          </Card>

          {/* Template List */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t('existingTemplates')} ({templates.length})</h3>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('noTemplates')}
                </p>
              ) : (
                templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => handleEntityChange(template.entityId)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.entity.name}
                      </p>
                    </div>
                    <Badge
                      style={{
                        backgroundColor: template.entity.colorHex,
                        color: 'white',
                      }}
                      className="text-xs"
                    >
                      {template.entity.name}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

