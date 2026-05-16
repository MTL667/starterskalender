'use client'

import { useState, useRef, useCallback } from 'react'
import { CriteriaQuestions } from './criteria-questions'
import type { VacancyDealbreaker, VacancyNiceToHave, CriterionResponse } from '@/lib/recruitment/types'

interface ApplicationFormProps {
  vacancyId: string
  entityColor: string
  dealbreakers?: VacancyDealbreaker[]
  niceToHaves?: VacancyNiceToHave[]
  translations: {
    emailLabel: string
    emailPlaceholder: string
    emailError: string
    cvLabel: string
    cvDropzone: string
    cvError: string
    motivationLabel: string
    motivationPlaceholder: string
    privacyNotice: string
    submit: string
    submitting: string
    successTitle: string
    successDescription: string
    alreadyApplied: string
    fileTooLarge: string
    fileWrongType: string
  }
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

const MAX_FILE_SIZE = 10_485_760
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function ApplicationForm({ vacancyId, entityColor, dealbreakers = [], niceToHaves = [], translations }: ApplicationFormProps) {
  const [state, setState] = useState<FormState>('idle')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvError, setCvError] = useState('')
  const [motivation, setMotivation] = useState('')
  const [responses, setResponses] = useState<CriterionResponse[]>([])
  const [serverError, setServerError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const validateEmail = useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) {
      setEmailError(translations.emailError)
      return false
    }
    if (!emailRegex.test(value)) {
      setEmailError(translations.emailError)
      return false
    }
    setEmailError('')
    return true
  }, [translations.emailError])

  const validateFile = useCallback((file: File | null): boolean => {
    if (!file) {
      setCvError(translations.cvError)
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      setCvError(translations.fileTooLarge)
      return false
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setCvError(translations.fileWrongType)
      return false
    }
    setCvError('')
    return true
  }, [translations.cvError, translations.fileTooLarge, translations.fileWrongType])

  const handleFileSelect = useCallback((file: File | null) => {
    if (file && validateFile(file)) {
      setCvFile(file)
    } else if (!file) {
      setCvFile(null)
      setCvError('')
    }
  }, [validateFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0] ?? null
    handleFileSelect(file)
  }, [handleFileSelect])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError('')

    const isEmailValid = validateEmail(email)
    const isFileValid = validateFile(cvFile)

    if (!isEmailValid || !isFileValid) return

    setState('submitting')

    const formData = new FormData()
    formData.set('email', email)
    formData.set('cv', cvFile!)
    formData.set('motivation', motivation)
    if (responses.length > 0) {
      formData.set('responses', JSON.stringify(responses))
    }
    formData.set('_hp', (e.currentTarget.elements.namedItem('_hp') as HTMLInputElement)?.value ?? '')

    try {
      const res = await fetch(`/api/public/vacancies/${vacancyId}/apply`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setState('success')
        return
      }

      const body = await res.json().catch(() => null)
      const code = body?.error?.code

      if (code === 'DUPLICATE') {
        setServerError(translations.alreadyApplied)
      } else if (code === 'RATE_LIMITED') {
        setServerError('Too many requests. Please try again later.')
      } else {
        setServerError(body?.error?.message ?? 'Something went wrong. Please try again.')
      }
      setState('error')
    } catch {
      setServerError('Network error. Please check your connection.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{translations.successTitle}</h2>
        <p className="text-base text-gray-600">{translations.successDescription}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <label htmlFor="_hp">Leave empty</label>
        <input type="text" id="_hp" name="_hp" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
          {translations.emailLabel} <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={translations.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateEmail(email)}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'email-error' : undefined}
          disabled={state === 'submitting'}
          className={`block w-full rounded-lg border px-4 py-3 text-base transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
            disabled:opacity-60 disabled:cursor-not-allowed
            ${emailError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
        />
        {emailError && (
          <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert">
            {emailError}
          </p>
        )}
      </div>

      {/* CV Upload */}
      <div>
        <label htmlFor="cv" className="block text-sm font-medium text-gray-700 mb-1.5">
          {translations.cvLabel} <span className="text-red-500">*</span>
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
          role="button"
          tabIndex={0}
          aria-label={translations.cvDropzone}
          aria-invalid={!!cvError}
          aria-describedby={cvError ? 'cv-error' : undefined}
          className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
            ${isDragOver ? 'border-blue-500 bg-blue-50' : cvError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
            ${state === 'submitting' ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {cvFile ? (
            <div className="flex items-center gap-3 text-sm">
              <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-gray-700 font-medium truncate max-w-[200px]">{cvFile.name}</span>
              <span className="text-gray-500">({(cvFile.size / 1_048_576).toFixed(1)} MB)</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCvFile(null); setCvError('') }}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                aria-label="Remove file"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <svg className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-gray-500 text-center">{translations.cvDropzone}</span>
            </>
          )}
          <input
            ref={fileInputRef}
            id="cv"
            name="cv"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
        {cvError && (
          <p id="cv-error" className="mt-1.5 text-sm text-red-600" role="alert">
            {cvError}
          </p>
        )}
      </div>

      {/* Motivation */}
      <div>
        <label htmlFor="motivation" className="block text-sm font-medium text-gray-700 mb-1.5">
          {translations.motivationLabel}
        </label>
        <textarea
          id="motivation"
          name="motivation"
          rows={4}
          maxLength={2000}
          placeholder={translations.motivationPlaceholder}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          disabled={state === 'submitting'}
          className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base resize-y
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
            disabled:opacity-60 disabled:cursor-not-allowed
            hover:border-gray-400 bg-white"
        />
        <p className="mt-1 text-xs text-gray-500 text-right">{motivation.length}/2000</p>
      </div>

      {/* Criteria questions */}
      {(dealbreakers.length > 0 || niceToHaves.length > 0) && (
        <CriteriaQuestions
          dealbreakers={dealbreakers}
          niceToHaves={niceToHaves}
          responses={responses}
          onResponsesChange={setResponses}
        />
      )}

      {/* Privacy notice */}
      <p
        className="text-xs text-gray-500 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: translations.privacyNotice }}
      />

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3" role="alert">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={state === 'submitting'}
        className="flex w-full items-center justify-center rounded-lg px-6 py-3 text-lg font-semibold text-white shadow-sm transition-opacity
          hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
          disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: entityColor, minHeight: '48px' }}
      >
        {state === 'submitting' ? (
          <>
            <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {translations.submitting}
          </>
        ) : (
          translations.submit
        )}
      </button>
    </form>
  )
}
