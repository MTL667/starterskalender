'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileSignature, Save, Trash2, Eye, Code, AlertCircle } from 'lucide-react'

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

const DEFAULT_TEMPLATE = `<table cellpadding='0' cellspacing='0' border='0' class='sh-src' style='margin: 0px; border-collapse: collapse; width: 600px;' width='600'>
  <tr>
    <td style='padding: 0px 1px 0px 0px;'>
      <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
        <tr>
          <td align='center' style='padding:0; vertical-align: top; width: 150px' width='150'>
            <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
              <tr><td></td></tr>
              <tr>
                <td>
                  <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                    <tr>
                      <td style='padding: 0;'>
                        <p style='margin: 1px;'>
                          <img src='https://signatures.spoq.digital/uploads/62/199/logo-148.png' alt='' title='Logo' style='display: block; border: 0px;'>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
          <td width='15' style='width:30px;'></td>
          <td style='padding: 0; vertical-align: top; width:420px' width='420'>
            <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
              <tr>
                <td style='padding: 10px 1px 10px 0px; white-space: nowrap;'>
                  <p style='font-family: Helvetica, sans-serif; font-size: 24px; line-height: 1.44; font-weight: 700; color: #0084ba; white-space: normal; margin: 1px 1px 1px 1px;'>
                    {NAME}
                  </p>
                  <p style='font-family: Helvetica, sans-serif; font-size: 16px; line-height: 1.44; white-space: normal; color:#0084ba; margin: 1px;'>
                    {JOB_TITLE}
                  </p>
                  <p style='font-weight:bold; font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.44; white-space: normal; color:#0084ba; margin: 1px;'>
                    Bedrijfsnaam
                  </p>
                </td>
              </tr>
              <tr></tr>
              <tr>
                <td style='padding: 10px 1px 10px 0px;'>
                  <table cellpadding='0' cellspacing='0' border='0' style='margin: 0px; border-collapse: collapse;'>
                    <tr>
                      <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                        <p style='margin: 1px;'>
                          <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                            <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/email.png' height='15'>
                          </span>
                        </p>
                      </td>
                      <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'> 
                        <p style='margin: 1px;'>
                          <a href='mailto:{EMAIL}' target='_blank' style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                            {EMAIL}
                          </a>
                        </p>
                      </td>
                      <td width='4' style='padding: 0px 0px 1px;'></td>
                    </tr>
                    <tr>
                      <td style='vertical-align: middle; white-space: nowrap; padding: 0px 15px 0px 0px;'>
                        <p style='margin: 1px;'>
                          <span style='font-family: Helvetica, sans-serif; font-size: 12px; line-height:1.2; white-space: nowrap; color: #0084ba;'>
                            <img style='height:15px;' src='https://signatures.spoq.digital/uploads/62/199/mobile.png' height='15'>
                          </span>
                        </p>
                      </td>
                      <td style='white-space: nowrap; padding: 0px 1px 0px 0px; vertical-align: middle;'>
                        <p style='margin: 1px;'>
                          <a href='tel:{PHONE}' target='_blank' style='font-family: Helvetica, sans-serif; font-size: 12px; line-height: 1.2; white-space: nowrap; color: #0084ba; text-decoration: none !important;'>
                            {PHONE}
                          </a>
                        </p>
                      </td>
                      <td width='4' style='padding: 0px 0px 1px;'></td>
                    </tr>
                  </table>
                </td> 
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`

export default function SignatureTemplatesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [templates, setTemplates] = useState<SignatureTemplate[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const [templateName, setTemplateName] = useState('')
  const [htmlTemplate, setHtmlTemplate] = useState('')
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState<'code' | 'visual'>('code')

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
    } else {
      setExistingTemplateId(null)
      setTemplateName('')
      setHtmlTemplate(DEFAULT_TEMPLATE)
    }
  }

  const handleSave = async () => {
    if (!selectedEntityId || !templateName || !htmlTemplate) {
      alert('Vul alle verplichte velden in')
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
        alert('Template opgeslagen!')
        fetchTemplates()
      } else {
        const error = await res.json()
        alert(`Fout: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Fout bij opslaan')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingTemplateId) return
    
    if (!confirm('Weet je zeker dat je deze template wilt verwijderen?')) return

    setLoading(true)

    try {
      const res = await fetch(`/api/signature-templates/${existingTemplateId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('Template verwijderd!')
        setExistingTemplateId(null)
        setTemplateName('')
        setHtmlTemplate('')
        fetchTemplates()
      } else {
        alert('Fout bij verwijderen')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Fout bij verwijderen')
    } finally {
      setLoading(false)
    }
  }

  const getPreviewHtml = () => {
    return htmlTemplate
      .replace(/{NAME}/g, 'Jan Peeters')
      .replace(/{JOB_TITLE}/g, 'HR Manager')
      .replace(/{EMAIL}/g, 'jan.peeters@bedrijf.be')
      .replace(/{PHONE}/g, '+32(0)471 12 34 56')
  }

  const selectedEntity = entities.find(e => e.id === selectedEntityId)

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Signature Templates</h1>
        <p className="text-muted-foreground">
          Beheer email signature templates per entiteit
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Template Editor
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="entity">Entiteit *</Label>
                <Select value={selectedEntityId} onValueChange={handleEntityChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecteer entiteit" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map(entity => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                        {templates.find(t => t.entityId === entity.id) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            ✓ Template
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEntityId && (
                <>
                  <div>
                    <Label htmlFor="name">Template Naam *</Label>
                    <Input
                      id="name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Bijv: ACEG Standard Signature"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template">HTML Template *</Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                      Gebruik placeholders: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{'{NAME}'}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{'{JOB_TITLE}'}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{'{EMAIL}'}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{'{PHONE}'}</code>
                    </p>
                    <Textarea
                      id="template"
                      value={htmlTemplate}
                      onChange={(e) => setHtmlTemplate(e.target.value)}
                      rows={20}
                      className="mt-2 font-mono text-xs"
                      placeholder="Plak hier de HTML template..."
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Placeholders
                        </p>
                        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                          <li><code>{'{NAME}'}</code> = Naam van de starter</li>
                          <li><code>{'{JOB_TITLE}'}</code> = Functie van de starter</li>
                          <li><code>{'{EMAIL}'}</code> = E-mailadres van de starter</li>
                          <li><code>{'{PHONE}'}</code> = Telefoonnummer van de starter</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={loading} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {existingTemplateId ? 'Update' : 'Opslaan'}
                    </Button>
                    {existingTemplateId && (
                      <Button 
                        onClick={handleDelete} 
                        disabled={loading}
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Verwijderen
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {previewMode === 'visual' ? <Eye className="h-5 w-5" /> : <Code className="h-5 w-5" />}
                Preview {selectedEntity && `(${selectedEntity.name})`}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant={previewMode === 'visual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('visual')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visueel
                </Button>
                <Button
                  variant={previewMode === 'code' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('code')}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Code
                </Button>
              </div>
            </div>

            {!selectedEntityId || !htmlTemplate ? (
              <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
                <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  Selecteer een entiteit en voeg een template toe om preview te zien
                </p>
              </div>
            ) : previewMode === 'visual' ? (
              <div className="border rounded-lg p-6 bg-white overflow-x-auto">
                <p className="text-xs text-muted-foreground mb-4 font-semibold">
                  TEST DATA: Jan Peeters, HR Manager, jan.peeters@bedrijf.be, +32(0)471 12 34 56
                </p>
                <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 max-h-[600px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {getPreviewHtml()}
                </pre>
              </div>
            )}
          </Card>

          {/* Template List */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Bestaande Templates ({templates.length})</h3>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nog geen templates aangemaakt
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
      </div>
    </div>
  )
}

