'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'

interface AddCandidateDialogProps {
  vacancyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const SOURCES = ['DIRECT', 'REFERRAL', 'LINKEDIN', 'OTHER'] as const

export function AddCandidateDialog({ vacancyId, open, onOpenChange, onSuccess }: AddCandidateDialogProps) {
  const t = useTranslations('recruitment')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState<string>('DIRECT')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setSource('DIRECT')
    setNotes('')
    setErrors({})
    setApiError(null)
  }, [])

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }
    switch (field) {
      case 'firstName':
        if (!value.trim()) newErrors.firstName = t('candidate.fieldRequired')
        else delete newErrors.firstName
        break
      case 'lastName':
        if (!value.trim()) newErrors.lastName = t('candidate.fieldRequired')
        else delete newErrors.lastName
        break
      case 'email':
        if (!value.trim()) newErrors.email = t('candidate.fieldRequired')
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = t('candidate.invalidEmail')
        else delete newErrors.email
        break
    }
    setErrors(newErrors)
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!firstName.trim()) newErrors.firstName = t('candidate.fieldRequired')
    if (!lastName.trim()) newErrors.lastName = t('candidate.fieldRequired')
    if (!email.trim()) newErrors.email = t('candidate.fieldRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('candidate.invalidEmail')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    setApiError(null)

    try {
      const res = await fetch(`/api/recruitment/vacancies/${vacancyId}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          source,
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        let result: any
        try {
          result = await res.json()
        } catch {
          setApiError(t('candidate.errorGeneric'))
          return
        }
        if (result.error?.code === 'DUPLICATE_CANDIDATE') {
          setErrors({ email: t('candidate.duplicateEmail') })
        } else if (result.error?.details?.fieldErrors) {
          const fieldErrors: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(result.error.details.fieldErrors)) {
            fieldErrors[key] = (msgs as string[])[0]
          }
          setErrors(fieldErrors)
        } else {
          setApiError(result.error?.message ?? t('candidate.errorGeneric'))
        }
        return
      }

      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch {
      setApiError(t('candidate.errorNetwork'))
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm()
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('candidate.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('candidate.addDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              {t('candidate.firstName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => validateField('firstName', firstName)}
              className={errors.firstName ? 'border-destructive' : ''}
            />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              {t('candidate.lastName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => validateField('lastName', lastName)}
              className={errors.lastName ? 'border-destructive' : ''}
            />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {t('candidate.email')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateField('email', email)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('candidate.phone')}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('candidate.source')}</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`candidate.source_${s.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('candidate.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t('candidate.notesPlaceholder')}
            />
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {t('candidate.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t('candidate.adding') : t('candidate.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
