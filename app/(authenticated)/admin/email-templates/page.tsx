'use client'

import { useTranslations } from 'next-intl'
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

const TEMPLATE_TYPE_KEYS = {
  WEEKLY_REMINDER: 'typeWeeklyReminder',
  MONTHLY_SUMMARY: 'typeMonthlySummary',
  QUARTERLY_SUMMARY: 'typeQuarterlySummary',
  YEARLY_SUMMARY: 'typeYearlySummary',
} as const

export default function EmailTemplatesPage() {
  const t = useTranslations('adminEmailTemplates')
  const tc = useTranslations('common')
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
      alert(t('templateSaved'))
    } catch (error) {
      console.error('Error saving template:', error)
      alert(error instanceof Error ? error.message : t('errorSavingTemplate'))
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setPreviewHtml(template.body)
    setPreviewOpen(true)
  }

  const TEMPLATE_COLORS: Record<string, string> = {
    WEEKLY_REMINDER: 'bg-amber-100 text-amber-800',
    MONTHLY_SUMMARY: 'bg-blue-100 text-blue-800',
    QUARTERLY_SUMMARY: 'bg-green-100 text-green-800',
    YEARLY_SUMMARY: 'bg-purple-100 text-purple-800',
  }

  const getTypeLabel = (type: string) => {
    const key = TEMPLATE_TYPE_KEYS[type as keyof typeof TEMPLATE_TYPE_KEYS]
    return key ? t(key) : type
  }

  const getTypeColor = (type: string) => {
    return TEMPLATE_COLORS[type] || 'bg-gray-100 text-gray-800'
  }

  const getVariablesForType = (type: string) => {
    return TEMPLATE_VARIABLES[type as keyof typeof TEMPLATE_VARIABLES] || []
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('backToAdmin')}
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                  {t('subtitle')}
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => { setSelectedTemplate(null); setDialogOpen(true); }}>
              <Mail className="h-4 w-4 mr-2" />
              {t('newTemplate')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {tc('loading')}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noTemplates')}
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
                          {t('disabled')}
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
                      {t('lastUpdated')}: {new Date(template.updatedAt).toLocaleString('nl-BE')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('preview')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {tc('edit')}
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
              {selectedTemplate ? t('editTemplate') : t('newTemplateTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('useVariablesHint')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="type">{t('type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as EmailTemplate['type'] })}
                disabled={!!selectedTemplate} // Can't change type after creation
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_TYPE_KEYS).map(([value, key]) => (
                    <SelectItem key={value} value={value}>
                      {t(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">{t('subject')}</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t('subjectPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="body">{t('body')}</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={15}
                className="font-mono text-sm"
                placeholder={t('bodyPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(value) => setFormData({ ...formData, isActive: value })}
              />
              <Label htmlFor="isActive">{tc('active')}</Label>
            </div>

            {/* Available Variables */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-4 w-4" />
                <span className="font-medium">{t('availableVariables')} {getTypeLabel(formData.type)}:</span>
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
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={loading || !formData.subject || !formData.body}>
              {loading ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('emailPreview')}</DialogTitle>
            <DialogDescription>
              {t('previewOf')} {selectedTemplate && getTypeLabel(selectedTemplate.type)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedTemplate && (
              <>
                <div className="mb-4 p-3 bg-muted rounded">
                  <div className="text-sm text-muted-foreground">{t('subjectPreview')}:</div>
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
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

