'use client'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export type DateChangeRecipient = {
  id: string
  name: string
  email: string
}

export type DateChangeSummary = {
  startDate?: { from: string | null; to: string | null }
  materialReturnDate?: { from: string | null; to: string | null }
}

interface DateChangeConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: DateChangeSummary
  recipients: DateChangeRecipient[]
  loadingRecipients: boolean
  previewError?: boolean
  submitting: boolean
  onConfirmWithNotify: () => void
  onConfirmWithoutNotify: () => void
}

function formatDisplay(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value.includes('T') ? value : `${value}T12:00:00`).toLocaleDateString('nl-BE')
  } catch {
    return value
  }
}

export function DateChangeConfirmationDialog({
  open,
  onOpenChange,
  summary,
  recipients,
  loadingRecipients,
  previewError = false,
  submitting,
  onConfirmWithNotify,
  onConfirmWithoutNotify,
}: DateChangeConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Datum gewijzigd — collega&apos;s informeren?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Je past een belangrijke datum aan. Wil je collega&apos;s hierover een e-mail sturen?</p>

              <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-foreground">
                {summary.startDate && (
                  <p>
                    <span className="font-medium">Startdatum:</span>{' '}
                    {formatDisplay(summary.startDate.from)} → {formatDisplay(summary.startDate.to)}
                  </p>
                )}
                {summary.materialReturnDate && (
                  <p>
                    <span className="font-medium">Inleverdatum:</span>{' '}
                    {formatDisplay(summary.materialReturnDate.from)} →{' '}
                    {formatDisplay(summary.materialReturnDate.to)}
                  </p>
                )}
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">
                  Ontvangers {loadingRecipients || previewError ? '' : `(${recipients.length})`}
                </p>
                {loadingRecipients ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Ontvangers laden…
                  </div>
                ) : previewError ? (
                  <p className="text-xs text-destructive">
                    Ontvangers konden niet geladen worden. Je kan wel opslaan zonder mail, of annuleren.
                  </p>
                ) : recipients.length === 0 ? (
                  <p className="text-xs">Niemand ontvangt momenteel deze melding (of iedereen heeft ze uitstaan).</p>
                ) : (
                  <ul className="max-h-40 overflow-y-auto rounded-md border divide-y text-xs">
                    {recipients.map((r) => (
                      <li key={r.id} className="px-3 py-2 flex flex-col">
                        <span className="font-medium text-foreground">{r.name}</span>
                        <span className="text-muted-foreground">{r.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
          <Button
            type="button"
            onClick={onConfirmWithNotify}
            disabled={submitting || loadingRecipients || previewError}
            className="w-full"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opslaan en mail sturen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onConfirmWithoutNotify}
            disabled={submitting}
            className="w-full"
          >
            Opslaan zonder mail
          </Button>
          <AlertDialogCancel disabled={submitting} className="w-full mt-0">
            Annuleren
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
