'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check, Loader2 } from 'lucide-react'

interface SignatureGeneratorDialogProps {
  open: boolean
  onClose: () => void
  starterData: {
    name: string
    roleTitle: string
    phoneNumber: string
    desiredEmail: string
  }
  entityId: string
}

export function SignatureGeneratorDialog({ open, onClose, starterData, entityId }: SignatureGeneratorDialogProps) {
  const t = useTranslations('signatures')
  const [copied, setCopied] = useState(false)
  const [template, setTemplate] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && entityId) {
      fetchTemplate()
    }
  }, [open, entityId])

  const fetchTemplate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/signature-templates?entityId=${entityId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          setTemplate(data[0].htmlTemplate)
        }
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSignature = () => {
    if (!template) return ''
    
    return template
      .replace(/{NAME}/g, starterData.name)
      .replace(/{JOB_TITLE}/g, starterData.roleTitle)
      .replace(/{EMAIL}/g, starterData.desiredEmail)
      .replace(/{PHONE}/g, starterData.phoneNumber)
  }

  const signature = generateSignature()

  const handleCopySignature = async () => {
    if (!signature) return
    
    try {
      await navigator.clipboard.writeText(signature)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying signature:', error)
      alert(t('errorCopy'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogDescription', { name: starterData.name })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-3 text-muted-foreground">Template laden...</p>
          </div>
        ) : !template ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Geen template gevonden voor deze entiteit
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">
                  VISUELE PREVIEW:
                </p>
                <Button 
                  onClick={handleCopySignature}
                  variant="outline"
                  size="sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Gekopieerd!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieer HTML
                    </>
                  )}
                </Button>
              </div>
              <div className="border rounded-lg p-6 bg-white">
                <div 
                  dangerouslySetInnerHTML={{ __html: signature }}
                  className="signature-preview"
                />
              </div>
            </div>

            {/* HTML Code */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                {t('htmlCodeLabel')}
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {signature}
                </pre>
              </div>
            </div>

            {/* Instructies */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                {t('instructionsTitle')}
              </p>
              <ol className="text-sm space-y-1 text-blue-800 dark:text-blue-200 list-decimal list-inside">
                <li>{t('instruction1')}</li>
                <li>{t('instruction2')}</li>
                <li>{t('instruction3')}</li>
                <li>{t('instruction4')}</li>
                <li>{t('instruction5')}</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
 
