'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileText, Upload, Trash2, CheckCircle2, Clock, Lock, ExternalLink, Loader2, Eye, Mail, Send, PenLine } from 'lucide-react'
import { PdfFieldPlacer, type SignatureFieldDef } from '@/components/documents/pdf-field-placer'

interface StarterDocument {
  id: string
  title: string
  signingMethod: 'SES' | 'QES'
  status: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED'
  fileName: string | null
  fileSize: number | null
  signedAt: string | null
  signedByName: string | null
  dueDate: string | null
  sortOrder: number
  prerequisiteId: string | null
  prerequisite: { id: string; title: string; status: string } | null
  teamsDriveId: string | null
  teamsItemId: string | null
  previewUrl?: string | null
  recipientEmail: string | null
  emailSentAt: string | null
  signingToken: string | null
  signatureFields: any[] | null
  localFilePath: string | null
}

interface Props {
  starterId: string
  canEdit: boolean
  onDocumentChange?: () => void
}

export function StarterDocuments({ starterId, canEdit, onDocumentChange }: Props) {
  const t = useTranslations('documents')
  const [documents, setDocuments] = useState<StarterDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<StarterDocument | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fieldPlacerDoc, setFieldPlacerDoc] = useState<StarterDocument | null>(null)
  const [signing, setSigning] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadForm, setUploadForm] = useState({
    title: '',
    signingMethod: 'SES' as 'SES' | 'QES',
    prerequisiteId: 'none',
    dueDate: '',
    recipientEmail: '',
  })

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/starters/${starterId}/documents`)
      if (res.ok) {
        setDocuments(await res.json())
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [starterId])

  const signedCount = documents.filter(d => d.status === 'SIGNED').length
  const totalCount = documents.length
  const progressPct = totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 0

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadForm.title) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', uploadForm.title)
      formData.append('signingMethod', uploadForm.signingMethod)
      if (uploadForm.prerequisiteId && uploadForm.prerequisiteId !== 'none') {
        formData.append('prerequisiteId', uploadForm.prerequisiteId)
      }
      if (uploadForm.dueDate) {
        formData.append('dueDate', new Date(uploadForm.dueDate).toISOString())
      }
      if (uploadForm.recipientEmail) {
        formData.append('recipientEmail', uploadForm.recipientEmail)
      }

      const res = await fetch(`/api/starters/${starterId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setUploadOpen(false)
        setUploadForm({ title: '', signingMethod: 'SES', prerequisiteId: 'none', dueDate: '', recipientEmail: '' })
        if (fileInputRef.current) fileInputRef.current.value = ''
        await fetchDocuments()
        onDocumentChange?.()
      }
    } catch (err) {
      console.error('Error uploading document:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleSign = async (doc: StarterDocument) => {
    if (doc.prerequisite && doc.prerequisite.status !== 'SIGNED') return

    setSigning(doc.id)
    try {
      const res = await fetch(`/api/starters/${starterId}/documents/${doc.id}/sign`, {
        method: 'POST',
      })

      if (res.ok) {
        await fetchDocuments()
        onDocumentChange?.()
      }
    } catch (err) {
      console.error('Error signing document:', err)
    } finally {
      setSigning(null)
    }
  }

  const handleDelete = async (doc: StarterDocument) => {
    try {
      const res = await fetch(`/api/starters/${starterId}/documents/${doc.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchDocuments()
        onDocumentChange?.()
      }
    } catch (err) {
      console.error('Error deleting document:', err)
    }
  }

  const handlePreview = async (doc: StarterDocument) => {
    setPreviewDoc(doc)
    setPreviewUrl(null)
    setPreviewOpen(true)

    try {
      const res = await fetch(`/api/starters/${starterId}/documents/${doc.id}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewUrl(data.previewUrl)
      }
    } catch (err) {
      console.error('Error getting preview:', err)
    }
  }

  const isLocked = (doc: StarterDocument) =>
    doc.prerequisite && doc.prerequisite.status !== 'SIGNED'

  const statusBadge = (doc: StarterDocument) => {
    if (doc.status === 'SIGNED') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t('signed')}
        </Badge>
      )
    }
    if (isLocked(doc)) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Lock className="h-3 w-3 mr-1" />
          {t('locked')}
        </Badge>
      )
    }
    if (doc.status === 'EXPIRED') {
      return (
        <Badge variant="destructive">
          {t('expired')}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-900/30">
        <Clock className="h-3 w-3 mr-1" />
        {t('pending')}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="border-t pt-4">
        <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('title')}
        </Label>
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t('loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('title')}
          {totalCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({signedCount}/{totalCount})
            </span>
          )}
        </Label>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-3 w-3 mr-1.5" />
            {t('upload')}
          </Button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              progressPct === 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {totalCount === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          {t('noDocuments')}
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                doc.status === 'SIGNED'
                  ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800'
                  : isLocked(doc)
                    ? 'opacity-60'
                    : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className={`h-4 w-4 mt-0.5 shrink-0 ${
                  doc.status === 'SIGNED' ? 'text-green-500' : 'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{doc.title}</span>
                    {statusBadge(doc)}
                    <Badge variant="outline" className="text-xs">
                      {doc.signingMethod === 'QES' ? 'Itsme' : t('simpleSign')}
                    </Badge>
                  </div>
                  {doc.signedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('signedBy', { name: doc.signedByName || '-' })} — {new Date(doc.signedAt).toLocaleDateString('nl-BE', { dateStyle: 'short' })}
                    </p>
                  )}
                  {isLocked(doc) && doc.prerequisite && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('waitingFor', { title: doc.prerequisite.title })}
                    </p>
                  )}
                  {doc.recipientEmail && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      {doc.emailSentAt ? (
                        <>
                          <Send className="h-3 w-3 text-green-500" />
                          {t('emailSent', { email: doc.recipientEmail })}
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3" />
                          {doc.recipientEmail}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {canEdit && doc.status === 'PENDING' && doc.localFilePath && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFieldPlacerDoc(doc)}
                    title={t('placeFields')}
                  >
                    <PenLine className="h-3 w-3 mr-1" />
                    {(doc.signatureFields && (doc.signatureFields as any[]).length > 0)
                      ? `${(doc.signatureFields as any[]).length} veld(en)`
                      : t('placeFields')}
                  </Button>
                )}
                {doc.teamsItemId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePreview(doc)}
                    title={t('preview')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                {doc.status === 'PENDING' && !isLocked(doc) && doc.signingMethod === 'SES' && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSign(doc)}
                    disabled={signing === doc.id}
                  >
                    {signing === doc.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    {t('sign')}
                  </Button>
                )}
                {doc.status === 'PENDING' && doc.signingMethod === 'QES' && !isLocked(doc) && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-7 text-xs bg-[#FF4612] hover:bg-[#E63E10]"
                    disabled
                    title={t('itsmeComingSoon')}
                  >
                    {t('signItsme')}
                  </Button>
                )}
                {canEdit && doc.status !== 'SIGNED' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc)}
                    title={t('delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('uploadTitle')}</DialogTitle>
            <DialogDescription>{t('uploadDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="doc-title">{t('labelTitle')}</Label>
              <Input
                id="doc-title"
                value={uploadForm.title}
                onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder={t('titlePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="doc-file">{t('labelFile')}</Label>
              <Input
                id="doc-file"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
              />
            </div>

            <div>
              <Label>{t('labelSigningMethod')}</Label>
              <Select
                value={uploadForm.signingMethod}
                onValueChange={(v: 'SES' | 'QES') => setUploadForm({ ...uploadForm, signingMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SES">{t('methodSES')}</SelectItem>
                  <SelectItem value="QES">{t('methodQES')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {documents.length > 0 && (
              <div>
                <Label>{t('labelPrerequisite')}</Label>
                <Select
                  value={uploadForm.prerequisiteId}
                  onValueChange={v => setUploadForm({ ...uploadForm, prerequisiteId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('prerequisiteNone')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('prerequisiteNone')}</SelectItem>
                    {documents.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="doc-email">{t('labelRecipientEmail')}</Label>
              <Input
                id="doc-email"
                type="email"
                value={uploadForm.recipientEmail}
                onChange={e => setUploadForm({ ...uploadForm, recipientEmail: e.target.value })}
                placeholder={t('emailPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('emailHint')}</p>
            </div>

            <div>
              <Label htmlFor="doc-due">{t('labelDueDate')}</Label>
              <Input
                id="doc-due"
                type="date"
                value={uploadForm.dueDate}
                onChange={e => setUploadForm({ ...uploadForm, dueDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadForm.title || !fileInputRef.current?.files?.length}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t('uploadButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title}</DialogTitle>
            <DialogDescription>{previewDoc?.fileName}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border"
                title={previewDoc?.title || 'Document preview'}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                {t('loadingPreview')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Field Placer Dialog */}
      <Dialog open={!!fieldPlacerDoc} onOpenChange={(open) => { if (!open) setFieldPlacerDoc(null) }}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>{fieldPlacerDoc?.title} — Handtekeningvelden plaatsen</DialogTitle>
          </DialogHeader>
          {fieldPlacerDoc && (
            <PdfFieldPlacer
              pdfUrl={`/api/starters/${starterId}/documents/${fieldPlacerDoc.id}/pdf`}
              initialFields={(fieldPlacerDoc.signatureFields as SignatureFieldDef[]) || []}
              onSave={async (fields) => {
                await fetch(`/api/starters/${starterId}/documents/${fieldPlacerDoc.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ signatureFields: fields }),
                })
                setFieldPlacerDoc(null)
                await fetchDocuments()
                onDocumentChange?.()
              }}
              onClose={() => setFieldPlacerDoc(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
