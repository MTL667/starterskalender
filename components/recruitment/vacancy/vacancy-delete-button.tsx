'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'

interface VacancyDeleteButtonProps {
  vacancyId: string
  status: string
}

export function VacancyDeleteButton({ vacancyId, status }: VacancyDeleteButtonProps) {
  const router = useRouter()
  const t = useTranslations('recruitment')
  const [deleting, setDeleting] = useState(false)

  if (status !== 'DRAFT') return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/recruitment/vacatures')
      } else {
        const result = await res.json()
        alert(result.error?.message || t('deleteVacancyOnlyDraft'))
      }
    } catch {
      alert(t('deleteVacancyOnlyDraft'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('deleteVacancy')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteVacancy')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteVacancyConfirm')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('backToVacancies')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            {deleting ? t('deleting') : t('deleteVacancy')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
