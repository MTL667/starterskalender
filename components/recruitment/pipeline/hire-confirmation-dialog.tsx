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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export interface HireDetails {
  startDate: string
  contractType: string
  roleTitle: string
  sendEmail: boolean
}

interface HireConfirmationDialogProps {
  open: boolean
  candidateName: string
  entityName: string
  vacancyTitle: string
  onConfirm: (details: HireDetails) => void
  onCancel: () => void
}

export function HireConfirmationDialog({
  open,
  candidateName,
  entityName,
  vacancyTitle,
  onConfirm,
  onCancel,
}: HireConfirmationDialogProps) {
  const t = useTranslations('recruitment.hire')
  const [startDate, setStartDate] = useState('')
  const [contractType, setContractType] = useState('')
  const [roleTitle, setRoleTitle] = useState(vacancyTitle)
  const [sendEmail, setSendEmail] = useState(true)

  useEffect(() => {
    if (open) {
      setStartDate('')
      setContractType('')
      setRoleTitle(vacancyTitle)
      setSendEmail(true)
    }
  }, [open, vacancyTitle])

  function handleConfirm() {
    onConfirm({ startDate, contractType, roleTitle, sendEmail })
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-green-700 dark:text-green-400">
            {t('title', { name: candidateName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t('entity')}</Label>
              <Input value={entityName} disabled className="bg-muted" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('function')}</Label>
              <Input
                value={roleTitle}
                onChange={e => setRoleTitle(e.target.value)}
                placeholder={t('functionPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t('startDate')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('contractType')}</Label>
              <Input
                value={contractType}
                onChange={e => setContractType(e.target.value)}
                placeholder={t('contractTypePlaceholder')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Switch id="hire-email" checked={sendEmail} onCheckedChange={setSendEmail} />
            <Label htmlFor="hire-email" className="text-sm">{t('sendNotification')}</Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
