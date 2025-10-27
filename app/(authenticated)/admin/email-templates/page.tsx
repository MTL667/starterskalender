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
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Mail, Eye, Code, Edit } from 'lucide-react'
import Link from 'next/link'
import { TEMPLATE_VARIABLES } from '@/lib/email-template-engine'

interface EmailTemplate {
  id: string
  type: 'WEEKLY_REMINDER' | 'MONTHLY_SUMMARY' | 'QUARTERLY_SUMMARY' | 'YEARLY_SUMMARY'
  subject: string
  body: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const TEMPLATE_TYPES = [
  { value: 'WEEKLY_REMINDER', label: '🔔 Wekelijkse Reminder', color: 'bg-amber-100 text-amber-800' },
  { value: 'MONTHLY_SUMMARY', label: '📊 Maandelijks Overzicht', color: 'bg-blue-100 text-blue-800' },
  { value: 'QUARTERLY_SUMMARY', label: '📈 Kwartaal Overzicht', color: 'bg-green-100 text-green-800' },
  { value: 'YEARLY_SUMMARY', label: '🎉 Jaarlijks Overzicht', color: 'bg-purple-100 text-purple-800' },
]

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [formData, setFormData] = useState({
    type: 'WEEKLY_REMINDER' as EmailTemplate['type'],
    subject: '',
    body: '',
    description: '',
    isActive: true,
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/email-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      type: template.type,
      subject: template.subject,
      body: template.body,
      description: template.description || '',
      isActive: template.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      const url = selectedTemplate
        ? `/api/admin/email-templates/${selectedTemplate.id}`
        : '/api/admin/email-templates'

      const method = selectedTemplate ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save template')
      }

      setDialogOpen(false)
      setSelectedTemplate(null)
      setFormData({
        type: 'WEEKLY_REMINDER',
        subject: '',
        body: '',
        description: '',
        isActive: true,
      })
      fetchTemplates()
      alert('Template succesvol opgeslagen!')
    } catch (error) {
      console.error('Error saving template:', error)
      alert(error instanceof Error ? error.message : 'Fout bij opslaan template')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setPreviewHtml(template.body)
    setPreviewOpen(true)
  }

  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type
  }

  const getTypeColor = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800'
  }

  const getVariablesForType = (type: string) => {
    return TEMPLATE_VARIABLES[type as keyof typeof TEMPLATE_VARIABLES] || []
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar Admin
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>
                  Beheer email templates voor notificaties
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => { setSelectedTemplate(null); setDialogOpen(true); }}>
              <Mail className="h-4 w-4 mr-2" />
              Nieuw Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laden...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nog geen templates aangemaakt
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getTypeColor(template.type)}>
                        {getTypeLabel(template.type)}
                      </Badge>
                      {!template.isActive && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Uitgeschakeld
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium">{template.subject}</div>
                    {template.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      Laatst bijgewerkt: {new Date(template.updatedAt).toLocaleString('nl-BE')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Bewerken
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Template Bewerken' : 'Nieuw Template'}
            </DialogTitle>
            <DialogDescription>
              Gebruik variabelen zoals {"{{userName}}"} in je template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as EmailTemplate['type'] })}
                disabled={!!selectedTemplate} // Can't change type after creation
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Onderwerp *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Bijv: 🔔 Reminder: {{starterName}} start volgende week"
              />
            </div>

            <div>
              <Label htmlFor="body">Email Body (HTML) *</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={15}
                className="font-mono text-sm"
                placeholder="HTML inhoud met variabelen..."
              />
            </div>

            <div>
              <Label htmlFor="description">Beschrijving</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Optionele beschrijving van dit template"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(value) => setFormData({ ...formData, isActive: value })}
              />
              <Label htmlFor="isActive">Actief</Label>
            </div>

            {/* Available Variables */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-4 w-4" />
                <span className="font-medium">Beschikbare variabelen voor {getTypeLabel(formData.type)}:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {getVariablesForType(formData.type).map(v => (
                  <div key={v.name} className="font-mono">
                    <span className="text-blue-600">{"{{" + v.name + "}}"}</span>
                    <span className="text-muted-foreground"> - {v.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={loading || !formData.subject || !formData.body}>
              {loading ? 'Bezig...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview van {selectedTemplate && getTypeLabel(selectedTemplate.type)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedTemplate && (
              <>
                <div className="mb-4 p-3 bg-muted rounded">
                  <div className="text-sm text-muted-foreground">Onderwerp:</div>
                  <div className="font-medium">{selectedTemplate.subject}</div>
                </div>
                <div 
                  className="border rounded p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

