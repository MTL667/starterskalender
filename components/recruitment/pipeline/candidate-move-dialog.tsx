'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface CandidateMoveDialogProps {
  open: boolean
  candidateName: string
  stageName: string
  triggersEmail?: boolean
  onConfirm: (options: { sendEmail: boolean; rejectionReason?: string }) => void
  onCancel: () => void
}

export function CandidateMoveDialog({
  open,
  candidateName,
  stageName,
  triggersEmail = false,
  onConfirm,
  onCancel,
}: CandidateMoveDialogProps) {
  const t = useTranslations('recruitment')
  const [sendEmail, setSendEmail] = useState(triggersEmail)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (open) {
      setSendEmail(triggersEmail)
      setRejectionReason('')
    }
  }, [open, triggersEmail])

  const isReject = stageName.toLowerCase().includes('reject') || stageName.toLowerCase().includes('afgewezen')

  function handleConfirm() {
    onConfirm({
      sendEmail,
      rejectionReason: isReject && rejectionReason.trim() ? rejectionReason.trim() : undefined,
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('pipeline.confirmMoveTitle', { name: candidateName, stage: stageName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReject
              ? t('pipeline.confirmMoveReject')
              : t('pipeline.confirmMoveHire')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {isReject && (
            <div>
              <Label className="text-sm">{t('pipeline.rejectionReason')}</Label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 w-full min-h-[60px] p-2 border rounded-md text-sm resize-y bg-background"
                placeholder={t('pipeline.rejectionReasonPlaceholder')}
                maxLength={2000}
              />
            </div>
          )}

          {triggersEmail && (
            <div className="flex items-center gap-2">
              <Switch
                id="send-email"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
              <Label htmlFor="send-email" className="text-sm">
                {t('pipeline.sendStatusEmail')}
              </Label>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('pipeline.cancelButton')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={isReject ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isReject ? t('pipeline.rejectButton') : t('pipeline.confirmButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
