'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, Mail, Upload, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type BatchSummary = {
  id: string
  fromEmail: string
  subject: string
  status: string
  leftoverEmails: string[]
  leftoverPdfNames: string[]
  createdAt: string
  _count: { items: number }
}

type BatchItem = {
  id: string
  sortIndex: number
  recipientEmail: string | null
  recipientName: string | null
  pdfFileName: string | null
  status: string
  errorMessage: string | null
  sgMessageId: string | null
  sentAt: string | null
  deliveredAt: string | null
  bouncedAt: string | null
}

type BatchDetail = {
  id: string
  fromEmail: string
  subject: string
  status: string
  leftoverEmails: string[]
  leftoverPdfNames: string[]
  errorMessage: string | null
  items: BatchItem[]
}

export default function PdfMailerPage() {
  const t = useTranslations('adminPdfMailer')
  const tc = useTranslations('common')

  const [recipients, setRecipients] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState(
    '<p>Hello {name},</p><p>Please find your document attached: <strong>{filename}</strong>.</p>'
  )
  const [files, setFiles] = useState<File[]>([])
  const [fromCheck, setFromCheck] = useState<{ ok: boolean; message: string } | null>(null)
  const [checkingFrom, setCheckingFrom] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [history, setHistory] = useState<BatchSummary[]>([])

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/admin/pdf-mailer/batches')
    if (!res.ok) return
    const data = await res.json()
    setHistory(data.batches || [])
  }, [])

  const loadBatch = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/pdf-mailer/batches/${id}`)
    if (!res.ok) return
    const data = await res.json()
    setBatch(data)
    setActiveBatchId(id)
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    if (!activeBatchId || !batch) return
    const awaitingDelivery = batch.items.some(i => i.status === 'SENT')
    const inFlight = batch.status === 'SENDING' || batch.status === 'DRAFT'
    if (!inFlight && !awaitingDelivery) return
    const timer = setInterval(() => loadBatch(activeBatchId), 2000)
    return () => clearInterval(timer)
  }, [activeBatchId, batch, loadBatch])

  const onDropFiles = (list: FileList | null) => {
    if (!list) return
    const pdfs = Array.from(list).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    setFiles(prev => [...prev, ...pdfs])
  }

  const handleValidateFrom = async () => {
    setCheckingFrom(true)
    setFromCheck(null)
    try {
      const res = await fetch('/api/admin/pdf-mailer/validate-from', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFromCheck({ ok: false, message: data.error || t('fromInvalid') })
      } else {
        setFromCheck({ ok: true, message: t('fromValid') })
      }
    } catch {
      setFromCheck({ ok: false, message: t('fromInvalid') })
    } finally {
      setCheckingFrom(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('recipients', recipients)
      form.set('fromEmail', fromEmail)
      form.set('subject', subject)
      form.set('bodyHtml', bodyHtml)
      form.set('start', 'true')
      for (const f of files) form.append('pdfs', f)

      const res = await fetch('/api/admin/pdf-mailer/batches', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('submitError'))

      setParseWarnings(Array.isArray(data.parseWarnings) ? data.parseWarnings : [])
      setActiveBatchId(data.batchId)
      await loadBatch(data.batchId)
      await loadHistory()
    } catch (err: any) {
      setError(err.message || t('submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const statusCounts = useMemo(() => {
    if (!batch) return null
    const counts: Record<string, number> = {}
    for (const item of batch.items) {
      counts[item.status] = (counts[item.status] || 0) + 1
    }
    return counts
  }, [batch])

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <Link href="/admin">
        <Button variant="ghost" className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('backToAdmin')}
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('newBatch')}</CardTitle>
          <CardDescription>{t('newBatchHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipients">{t('recipients')}</Label>
            <Textarea
              id="recipients"
              rows={6}
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              placeholder={t('recipientsPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('pdfs')}</Label>
            <div
              className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                onDropFiles(e.dataTransfer.files)
              }}
              onClick={() => document.getElementById('pdf-input')?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('dropPdfs')}</p>
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={e => onDropFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <ul className="text-sm space-y-1 max-h-40 overflow-auto">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-muted-foreground w-6">{i + 1}.</span>
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
            {files.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setFiles([])}>
                {t('clearPdfs')}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromEmail">{t('fromEmail')}</Label>
            <div className="flex gap-2">
              <Input
                id="fromEmail"
                type="email"
                value={fromEmail}
                onChange={e => {
                  setFromEmail(e.target.value)
                  setFromCheck(null)
                }}
                placeholder="noreply@bedrijf.be"
              />
              <Button type="button" variant="outline" onClick={handleValidateFrom} disabled={checkingFrom || !fromEmail}>
                {checkingFrom ? <Loader2 className="h-4 w-4 animate-spin" /> : t('checkFrom')}
              </Button>
            </div>
            {fromCheck && (
              <p className={`text-sm flex items-center gap-1 ${fromCheck.ok ? 'text-green-600' : 'text-red-600'}`}>
                {fromCheck.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {fromCheck.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{t('subject')}</Label>
            <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('subjectPlaceholder')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyHtml">{t('body')}</Label>
            <Textarea id="bodyHtml" rows={6} value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t('placeholdersHint')}</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {parseWarnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-1">
              <p className="font-medium">{t('parseWarnings')}</p>
              <ul className="list-disc pl-5">
                {parseWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={submitting || !recipients || !files.length || !fromEmail || !subject || !bodyHtml}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {t('startBatch')}
          </Button>
        </CardContent>
      </Card>

      {batch && (
        <Card>
          <CardHeader>
            <CardTitle>{t('overview')}</CardTitle>
            <CardDescription>
              {t('batchStatus', { status: batch.status })}
              {statusCounts && (
                <span className="ml-2 text-xs">
                  ({Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(' · ')})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(batch.leftoverEmails.length > 0 || batch.leftoverPdfNames.length > 0) && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-1">
                {batch.leftoverEmails.length > 0 && (
                  <p>
                    <strong>{t('leftoverEmails')}:</strong> {batch.leftoverEmails.join(', ')}
                  </p>
                )}
                {batch.leftoverPdfNames.length > 0 && (
                  <p>
                    <strong>{t('leftoverPdfs')}:</strong> {batch.leftoverPdfNames.join(', ')}
                  </p>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">{t('colRecipient')}</th>
                    <th className="py-2 pr-2">{t('colPdf')}</th>
                    <th className="py-2 pr-2">{t('colStatus')}</th>
                    <th className="py-2">{t('colDetail')}</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.items.map(item => (
                    <tr key={item.id} className="border-b border-muted/50">
                      <td className="py-2 pr-2">{item.sortIndex + 1}</td>
                      <td className="py-2 pr-2">
                        {item.recipientName ? `${item.recipientName} ` : ''}
                        <span className="text-muted-foreground">{item.recipientEmail || '—'}</span>
                      </td>
                      <td className="py-2 pr-2">{item.pdfFileName || '—'}</td>
                      <td className="py-2 pr-2">{item.status}</td>
                      <td className="py-2 text-muted-foreground">
                        {item.errorMessage ||
                          (item.deliveredAt ? t('delivered') : item.bouncedAt ? t('bounced') : item.sgMessageId || '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('history')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {history.map(h => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => loadBatch(h.id)}
                  >
                    {new Date(h.createdAt).toLocaleString()} — {h.subject} ({h.status}, {h._count.items} {t('items')})
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
