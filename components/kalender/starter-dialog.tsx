'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Trash2, XCircle, Copy, Check, FileSignature, Search, UserCheck, PenLine, RefreshCw, Clock } from 'lucide-react'
import { getExperienceText } from '@/lib/experience-utils'
import { useSession } from 'next-auth/react'
import { SignatureGeneratorDialog } from '@/components/signature-generator-dialog'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
  name: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  contractSignedOn?: string | null
  startDate: string | null
  isPendingBoarding?: boolean
  isCancelled?: boolean
  cancelledAt?: string | null
  cancelReason?: string | null
  hasExperience?: boolean
  experienceSince?: string | null
  experienceRole?: string | null
  experienceEntity?: string | null
  phoneNumber?: string | null
  desiredEmail?: string | null
  fromEntityId?: string | null
  fromRoleTitle?: string | null
  entity?: {
    id: string
  } | null
  fromEntity?: {
    id: string
    name: string
    colorHex: string
  } | null
}

interface Entity {
  id: string
  name: string
  colorHex: string
}

interface JobRole {
  id: string
  title: string
  entityId: string
  isActive: boolean
}

interface Employee {
  id: string
  name: string
  language: string
  roleTitle: string | null
  region: string | null
  phoneNumber: string | null
  desiredEmail: string | null
  entity: {
    id: string
    name: string
    colorHex: string
  } | null
}

interface StarterDialogProps {
  open: boolean
  onClose: (refreshData?: boolean) => void
  starter: Starter | null
  entities: Entity[]
  canEdit: boolean
}

export function StarterDialog({ open, onClose, starter, entities, canEdit }: StarterDialogProps) {
  const t = useTranslations('starterDialog')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const isEdit = !!starter
  const [loading, setLoading] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [starterMaterials, setStarterMaterials] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [isITResponsible, setIsITResponsible] = useState(false)
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [hasSignatureTemplate, setHasSignatureTemplate] = useState(false)
  const employeeListRef = useRef<HTMLDivElement>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [showEmployeeList, setShowEmployeeList] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [emailTaskToggling, setEmailTaskToggling] = useState(false)
  const [phoneTaskToggling, setPhoneTaskToggling] = useState(false)
  const [regeneratingTasks, setRegeneratingTasks] = useState(false)
  const [pendingConfirmOpen, setPendingConfirmOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'ONBOARDING' as 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION',
    name: '',
    language: 'NL',
    entityId: '',
    fromEntityId: '',
    fromRoleTitle: '',
    roleTitle: '',
    region: '',
    via: '',
    notes: '',
    contractSignedOn: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    hasExperience: false,
    experienceSince: '',
    experienceRole: '',
    experienceEntity: '',
    phoneNumber: '',
    desiredEmail: '',
  })

  // Check if user can edit extra info (notes)
  // Everyone except NONE can edit notes for entities they have access to
  const canEditExtraInfo = (() => {
    if (!session?.user) return false
    if (session.user.role === 'NONE') return false
    
    // HR_ADMIN can edit everything
    if (session.user.role === 'HR_ADMIN') return true
    
    // For other roles, check if they have access to this entity
    if (starter?.entity?.id) {
      const hasAccess = session.user.memberships?.some(
        m => m.entityId === starter.entity?.id
      )
      return hasAccess || false
    }
    
    // For new starters, check if they have access to selected entity
    if (formData.entityId && !isEdit) {
      const hasAccess = session.user.memberships?.some(
        m => m.entityId === formData.entityId
      )
      return hasAccess || false
    }
    
    return false
  })()

  // Check if user can edit contact info (email & phone)
  // Only HR_ADMIN or IT_SETUP responsible can edit these fields
  const canEditContactInfo = (() => {
    if (!session?.user) return false
    
    // HR_ADMIN can always edit
    if (session.user.role === 'HR_ADMIN') return true
    
    // IT_SETUP verantwoordelijke can edit
    return isITResponsible
  })()

  // Close employee list on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (employeeListRef.current && !employeeListRef.current.contains(e.target as Node)) {
        setShowEmployeeList(false)
      }
    }
    if (showEmployeeList) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmployeeList])

  // Fetch employees for offboarding selection
  useEffect(() => {
    if ((formData.type === 'OFFBOARDING' || formData.type === 'MIGRATION') && !isEdit && !manualEntry) {
      fetch(`/api/starters/employees${employeeSearch ? `?search=${encodeURIComponent(employeeSearch)}` : ''}`)
        .then(res => res.json())
        .then(data => setEmployees(Array.isArray(data) ? data : []))
        .catch(err => {
          console.error('Error loading employees:', err)
          setEmployees([])
        })
    }
  }, [formData.type, employeeSearch, isEdit, manualEntry])

  // Laad job roles voor de gekozen entiteit
  useEffect(() => {
    if (formData.entityId) {
      fetch(`/api/job-roles?entityId=${formData.entityId}`)
        .then(res => res.json())
        .then(data => setJobRoles(data.filter((r: JobRole) => r.isActive)))
        .catch(err => console.error('Error loading job roles:', err))
    } else {
      setJobRoles([])
    }
  }, [formData.entityId])

  // Laad materials voor bestaande starter
  useEffect(() => {
    if (starter?.id) {
      fetch(`/api/starters/${starter.id}/materials`)
        .then(res => res.json())
        .then(data => setStarterMaterials(data))
        .catch(err => console.error('Error loading materials:', err))
    } else {
      setStarterMaterials([])
    }
  }, [starter?.id])

  // Laad taken voor bestaande starter
  useEffect(() => {
    if (starter?.id) {
      fetch(`/api/tasks?starterId=${starter.id}`)
        .then(res => res.json())
        .then(data => setTasks(data || []))
        .catch(err => {
          console.error('Error loading tasks:', err)
          setTasks([])
        })
    } else {
      setTasks([])
    }
  }, [starter?.id])

  // Check of huidige user IT_SETUP verantwoordelijke is voor deze entiteit
  useEffect(() => {
    if (!session?.user?.id) {
      setIsITResponsible(false)
      return
    }

    const entityId = starter?.entity?.id || formData.entityId
    if (!entityId) {
      setIsITResponsible(false)
      return
    }

    // Check via dedicated endpoint
    fetch(`/api/task-assignments/check-responsibility?entityId=${entityId}&taskType=IT_SETUP`)
      .then(res => res.json())
      .then(data => {
        setIsITResponsible(data.isResponsible || false)
      })
      .catch(err => {
        console.error('Error checking IT responsibility:', err)
        setIsITResponsible(false)
      })
  }, [session?.user?.id, starter?.entity?.id, formData.entityId])

  // Check of entiteit een signature template heeft
  useEffect(() => {
    const entityId = starter?.entity?.id || formData.entityId
    if (!entityId) {
      setHasSignatureTemplate(false)
      return
    }

    fetch(`/api/signature-templates?entityId=${entityId}`)
      .then(res => res.json())
      .then(data => {
        setHasSignatureTemplate(data.length > 0)
      })
      .catch(err => {
        console.error('Error checking signature template:', err)
        setHasSignatureTemplate(false)
      })
  }, [starter?.entity?.id, formData.entityId])

  useEffect(() => {
    if (starter) {
      setFormData({
        type: starter.type || 'ONBOARDING',
        name: starter.name,
        language: starter.language || 'NL',
        entityId: starter.entity?.id || '',
        fromEntityId: starter.fromEntity?.id || starter.fromEntityId || '',
        fromRoleTitle: starter.fromRoleTitle || '',
        roleTitle: starter.roleTitle || '',
        region: starter.region || '',
        via: starter.via || '',
        notes: starter.notes || '',
        contractSignedOn: starter.contractSignedOn ? format(new Date(starter.contractSignedOn), 'yyyy-MM-dd') : '',
        startDate: starter.startDate ? format(new Date(starter.startDate), 'yyyy-MM-dd') : '',
        hasExperience: starter.hasExperience || false,
        experienceSince: starter.experienceSince ? format(new Date(starter.experienceSince), 'yyyy-MM-dd') : '',
        experienceRole: starter.experienceRole || '',
        experienceEntity: starter.experienceEntity || '',
        phoneNumber: starter.phoneNumber || '',
        desiredEmail: starter.desiredEmail || '',
      })
    } else {
      setFormData({
        type: 'ONBOARDING',
        name: '',
        language: 'NL',
        entityId: '',
        fromEntityId: '',
        fromRoleTitle: '',
        roleTitle: '',
        region: '',
        via: '',
        notes: '',
        contractSignedOn: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        hasExperience: false,
        experienceSince: '',
        experienceRole: '',
        experienceEntity: '',
        phoneNumber: '',
        desiredEmail: '',
      })
      setManualEntry(false)
      setSelectedEmployee(null)
      setEmployeeSearch('')
      setShowEmployeeList(false)
    }
  }, [starter, open])

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeList(false)
    setEmployeeSearch('')
    if (formData.type === 'MIGRATION') {
      setFormData(prev => ({
        ...prev,
        name: employee.name,
        language: employee.language || 'NL',
        fromEntityId: employee.entity?.id || '',
        fromRoleTitle: employee.roleTitle || '',
        region: employee.region || '',
        phoneNumber: employee.phoneNumber || '',
        desiredEmail: employee.desiredEmail || '',
        entityId: '',
        roleTitle: '',
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        name: employee.name,
        language: employee.language || 'NL',
        entityId: employee.entity?.id || '',
        roleTitle: employee.roleTitle || '',
        region: employee.region || '',
        phoneNumber: employee.phoneNumber || '',
        desiredEmail: employee.desiredEmail || '',
      }))
    }
  }

  const handleSaveExtraInfo = async () => {
    if (!isEdit || !starter) return
    
    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: formData.notes || null }),
      })

      if (!res.ok) {
        throw new Error('Failed to save extra info')
      }

      onClose(true)
    } catch (error) {
      console.error('Error saving extra info:', error)
      alert(t('errorSaving'))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveContactInfo = async () => {
    if (!isEdit || !starter) return
    
    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: formData.phoneNumber || null,
          desiredEmail: formData.desiredEmail || null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save contact info')
      }

      onClose(true)
    } catch (error) {
      console.error('Error saving contact info:', error)
      alert(t('errorSaving'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    // For new ONBOARDING starters without startDate, show pending boarding confirmation
    if (!isEdit && formData.type === 'ONBOARDING' && !formData.startDate) {
      setPendingConfirmOpen(true)
      return
    }

    await submitStarter(false)
  }

  const submitStarter = async (isPendingBoarding: boolean) => {
    setLoading(true)

    try {
      const hasStartDate = !!formData.startDate && !isPendingBoarding

      // Valideer blokkades (alleen als er een startdatum is)
      if (hasStartDate) {
        const startDateChanged = !isEdit || (starter?.startDate && formData.startDate !== format(new Date(starter.startDate), 'yyyy-MM-dd'))
        if (startDateChanged) {
          const validationRes = await fetch('/api/blocked-periods', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityId: formData.entityId,
              jobRoleTitle: formData.roleTitle,
              startDate: new Date(formData.startDate).toISOString(),
            }),
          })

          const validation = await validationRes.json()
          if (validation.blocked) {
            alert(
              t('blockedPeriodAlert', {
                jobRole: validation.jobRole,
                start: format(new Date(validation.period.startDate), 'dd MMM yyyy'),
                end: format(new Date(validation.period.endDate), 'dd MMM yyyy'),
                reason: validation.reason || t('noReasonGiven')
              })
            )
            setLoading(false)
            return
          }
        }
      }

      const data: any = {
        type: formData.type,
        name: formData.name,
        language: formData.language,
        entityId: formData.entityId || null,
        fromEntityId: formData.type === 'MIGRATION' ? (formData.fromEntityId || null) : null,
        fromRoleTitle: formData.type === 'MIGRATION' ? (formData.fromRoleTitle || null) : null,
        roleTitle: formData.roleTitle || null,
        region: formData.region || null,
        via: formData.via || null,
        notes: formData.notes || null,
        contractSignedOn: formData.type === 'ONBOARDING' && formData.contractSignedOn 
          ? new Date(formData.contractSignedOn).toISOString() 
          : null,
        startDate: hasStartDate ? new Date(formData.startDate).toISOString() : null,
        isPendingBoarding: isPendingBoarding,
        hasExperience: formData.type === 'ONBOARDING' ? formData.hasExperience : false,
        experienceSince: formData.type === 'ONBOARDING' && formData.hasExperience && formData.experienceSince 
          ? new Date(formData.experienceSince).toISOString() 
          : null,
        experienceRole: formData.type === 'ONBOARDING' && formData.hasExperience ? (formData.experienceRole || null) : null,
        experienceEntity: formData.type === 'ONBOARDING' && formData.hasExperience ? (formData.experienceEntity || null) : null,
        phoneNumber: formData.phoneNumber || null,
        desiredEmail: formData.desiredEmail || null,
      }

      const url = isEdit ? `/api/starters/${starter.id}` : '/api/starters'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        throw new Error('Failed to save starter')
      }

      // Als nieuwe starter (niet pending), wijs automatisch materials toe van de job role
      if (!isEdit && !isPendingBoarding && formData.roleTitle && formData.entityId) {
        const starterData = await res.json()
        if (starterData.id) {
          try {
            await fetch(`/api/starters/${starterData.id}/materials`, {
              method: 'POST',
            })
          } catch (materialError) {
            console.error('Error assigning materials:', materialError)
          }
        }
      }

      onClose(true)
    } catch (error) {
      console.error('Error saving starter:', error)
      alert(t('errorSaving'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!starter || !confirm(t('confirmDeleteStarter'))) {
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete starter')
      }

      onClose(true)
    } catch (error) {
      console.error('Error deleting starter:', error)
      alert(t('errorDeleting'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!starter) return

    setLoading(true)

    try {
      const res = await fetch(`/api/starters/${starter.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel starter')
      }

      setCancelDialogOpen(false)
      setCancelReason('')
      onClose(true)
      alert(t('cancelSuccess'))
    } catch (error) {
      console.error('Error cancelling starter:', error)
      alert(error instanceof Error ? error.message : 'Fout bij annuleren')
    } finally {
      setLoading(false)
    }
  }

  const handleMaterialToggle = async (materialId: string, isProvided: boolean) => {
    if (!starter) return

    try {
      const res = await fetch(`/api/starters/${starter.id}/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isProvided }),
      })

      if (res.ok) {
        // Reload materials
        const materialsRes = await fetch(`/api/starters/${starter.id}/materials`)
        if (materialsRes.ok) {
          setStarterMaterials(await materialsRes.json())
        }
      }
    } catch (error) {
      console.error('Error toggling material:', error)
      alert(t('errorMaterial'))
    }
  }

  const handleCopy = async (field: 'phone' | 'email') => {
    const value = field === 'phone' ? formData.phoneNumber : formData.desiredEmail
    
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      
      // Reset na 2 seconden
      setTimeout(() => {
        setCopiedField(null)
      }, 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert(t('errorCopy'))
    }
  }

  // Find the phone task for this starter
  const phoneTask = tasks.find((task: any) =>
    task.type === 'IT_SETUP' &&
    task.title?.toLowerCase().includes('telefoonnummer')
  )
  const isPhoneTaskAssignee = phoneTask?.assignedTo?.id === session?.user?.id
  const isPhoneTaskRequested = phoneTask?.status === 'IN_PROGRESS'
  const isPhoneTaskCompleted = phoneTask?.status === 'COMPLETED'

  const handleTogglePhoneTask = async () => {
    if (!phoneTask || phoneTaskToggling) return
    setPhoneTaskToggling(true)
    try {
      if (isPhoneTaskRequested) {
        const res = await fetch(`/api/tasks/${phoneTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING' }),
        })
        if (res.ok) {
          setTasks(prev => prev.map((t: any) => t.id === phoneTask.id ? { ...t, status: 'PENDING' } : t))
        }
      } else {
        const res = await fetch(`/api/tasks/${phoneTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_PROGRESS' }),
        })
        if (res.ok) {
          setTasks(prev => prev.map((t: any) => t.id === phoneTask.id ? { ...t, status: 'IN_PROGRESS' } : t))
        }
      }
    } catch (error) {
      console.error('Error toggling phone task:', error)
    } finally {
      setPhoneTaskToggling(false)
    }
  }

  // Find the email creation task for this starter
  const emailTask = tasks.find((task: any) =>
    task.type === 'IT_SETUP' &&
    task.title?.toLowerCase().includes('mailadres')
  )
  const isEmailTaskAssignee = emailTask?.assignedTo?.id === session?.user?.id
  const isEmailTaskCompleted = emailTask?.status === 'COMPLETED'

  const handleToggleEmailTask = async () => {
    if (!emailTask || emailTaskToggling) return
    setEmailTaskToggling(true)
    try {
      if (isEmailTaskCompleted) {
        const res = await fetch(`/api/tasks/${emailTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING' }),
        })
        if (res.ok) {
          setTasks(prev => prev.map((t: any) => t.id === emailTask.id ? { ...t, status: 'PENDING', completedAt: null } : t))
        }
      } else {
        const res = await fetch(`/api/tasks/${emailTask.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completionNotes: '' }),
        })
        if (res.ok) {
          setTasks(prev => prev.map((t: any) => t.id === emailTask.id ? { ...t, status: 'COMPLETED', completedAt: new Date().toISOString() } : t))
        }
      }
    } catch (error) {
      console.error('Error toggling email task:', error)
    } finally {
      setEmailTaskToggling(false)
    }
  }

  const isAdmin = (session?.user as any)?.role === 'HR_ADMIN' || (session?.user as any)?.role === 'ADMIN'

  const handleRegenerateTasks = async () => {
    if (!starter || regeneratingTasks) return
    setRegeneratingTasks(true)
    try {
      const res = await fetch(`/api/starters/${starter.id}/regenerate-tasks`, {
        method: 'POST',
      })
      if (res.ok) {
        const result = await res.json()
        console.log(`Regenerated tasks: deleted ${result.deleted}, created ${result.created}`)
        const tasksRes = await fetch(`/api/tasks?starterId=${starter.id}`)
        if (tasksRes.ok) {
          const newTasks = await tasksRes.json()
          setTasks(newTasks)
        }
      }
    } catch (error) {
      console.error('Error regenerating tasks:', error)
    } finally {
      setRegeneratingTasks(false)
    }
  }

  // Check of alle velden voor signature generatie ingevuld zijn en template bestaat
  const canGenerateSignature = !!(
    hasSignatureTemplate &&
    formData.name &&
    formData.roleTitle &&
    formData.phoneNumber &&
    formData.desiredEmail
  )

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit 
                ? (formData.type === 'MIGRATION' ? t('titleEditMigration') : formData.type === 'OFFBOARDING' ? t('titleEditOffboarding') : t('titleEditOnboarding'))
                : (formData.type === 'MIGRATION' ? t('titleNewMigration') : formData.type === 'OFFBOARDING' ? t('titleNewOffboarding') : t('titleNewOnboarding'))
              }
              {starter?.isCancelled && (
                <span className="ml-3 text-sm font-normal text-red-600 dark:text-red-400">
                  {t('cancelled')}
                </span>
              )}
            </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? (formData.type === 'MIGRATION' ? t('descriptionEditMigration') : formData.type === 'OFFBOARDING' ? t('descriptionEditOffboarding') : t('descriptionEdit'))
              : (formData.type === 'MIGRATION' ? t('descriptionNewMigration') : formData.type === 'OFFBOARDING' ? t('descriptionNewOffboarding') : t('descriptionNew'))
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">{t('labelType')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION') => {
                  setFormData({ ...formData, type: value, fromEntityId: '', fromRoleTitle: '' })
                  setSelectedEmployee(null)
                  setManualEntry(false)
                  setEmployeeSearch('')
                }}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONBOARDING">{t('typeOnboarding')}</SelectItem>
                  <SelectItem value="OFFBOARDING">{t('typeOffboarding')}</SelectItem>
                  <SelectItem value="MIGRATION">{t('typeMigration')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">{t('labelName')}</Label>
              {(formData.type === 'OFFBOARDING' || formData.type === 'MIGRATION') && !isEdit && !manualEntry ? (
                <div className="space-y-2">
                  {selectedEmployee ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <UserCheck className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="font-medium flex-1">{selectedEmployee.name}</span>
                      {selectedEmployee.entity && (
                        <Badge
                          style={{ backgroundColor: selectedEmployee.entity.colorHex, color: 'white' }}
                          className="text-xs"
                        >
                          {selectedEmployee.entity.name}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(null)
                          setFormData(prev => ({ ...prev, name: '', language: 'NL', entityId: '', fromEntityId: '', fromRoleTitle: '', roleTitle: '', region: '', phoneNumber: '', desiredEmail: '' }))
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="relative" ref={employeeListRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="employeeSearch"
                          value={employeeSearch}
                          onChange={(e) => {
                            setEmployeeSearch(e.target.value)
                            setShowEmployeeList(true)
                          }}
                          onFocus={() => setShowEmployeeList(true)}
                          placeholder={t('searchEmployee')}
                          className="pl-9"
                          autoComplete="off"
                        />
                      </div>
                      {showEmployeeList && (
                        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-950 border rounded-lg shadow-lg">
                          {employees.length > 0 ? (
                            employees.map(emp => (
                              <button
                                key={emp.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2"
                                onClick={() => handleEmployeeSelect(emp)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{emp.name}</div>
                                  {emp.roleTitle && (
                                    <div className="text-xs text-muted-foreground truncate">{emp.roleTitle}</div>
                                  )}
                                </div>
                                {emp.entity && (
                                  <Badge
                                    style={{ backgroundColor: emp.entity.colorHex, color: 'white' }}
                                    className="text-xs shrink-0"
                                  >
                                    {emp.entity.name}
                                  </Badge>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                              {t('noEmployeesFound')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setManualEntry(true)
                      setSelectedEmployee(null)
                      setShowEmployeeList(false)
                      setFormData(prev => ({ ...prev, fromEntityId: '', fromRoleTitle: '' }))
                    }}
                  >
                    <PenLine className="h-3 w-3 mr-1" />
                    {t('enterManually')}
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={!canEdit}
                  />
                  {(formData.type === 'OFFBOARDING' || formData.type === 'MIGRATION') && !isEdit && manualEntry && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground mt-1"
                      onClick={() => {
                        setManualEntry(false)
                        setFormData(prev => ({ ...prev, name: '', language: 'NL', entityId: '', fromEntityId: '', fromRoleTitle: '', roleTitle: '', region: '', phoneNumber: '', desiredEmail: '' }))
                      }}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      {t('selectFromList')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="language">{t('labelLanguage')}</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NL">{t('optionNL')}</SelectItem>
                  <SelectItem value="FR">{t('optionFR')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'MIGRATION' && (formData.fromEntityId || formData.fromRoleTitle) && (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-1">
                <Label className="text-xs font-semibold text-orange-700 dark:text-orange-300">{t('labelFromEntity')}</Label>
                <div className="text-sm">
                  {entities.find(e => e.id === formData.fromEntityId)?.name || '—'}
                  {formData.fromRoleTitle && <span className="text-muted-foreground"> — {formData.fromRoleTitle}</span>}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="entityId">
                {formData.type === 'MIGRATION' ? t('labelToEntity') : t('labelEntity')}
              </Label>
              <Select
                value={formData.entityId || undefined}
                onValueChange={(value) => setFormData({ ...formData, entityId: value, roleTitle: '' })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholderEntity')} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="roleTitle">{formData.type === 'MIGRATION' ? t('labelToRole') : t('labelRole')}</Label>
              {formData.entityId && jobRoles.length > 0 ? (
                <Select
                  value={formData.roleTitle || undefined}
                  onValueChange={(value) => setFormData({ ...formData, roleTitle: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholderRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {jobRoles.map(role => (
                      <SelectItem key={role.id} value={role.title}>
                        {role.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="roleTitle"
                  value={formData.roleTitle}
                  onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                  placeholder={formData.entityId ? t('placeholderNoRoles') : t('placeholderSelectEntityFirst')}
                  disabled={!formData.entityId || !canEdit}
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formData.entityId 
                  ? (jobRoles.length > 0 ? t('hintChooseRole') : t('hintNoRoles'))
                  : t('hintEntityFirst')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">{t('labelRegion')}</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="via">{t('labelVia')}</Label>
                <Input
                  id="via"
                  value={formData.via}
                  onChange={(e) => setFormData({ ...formData, via: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className={`grid gap-4 ${formData.type === 'ONBOARDING' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {formData.type === 'ONBOARDING' && (
                <div>
                  <Label htmlFor="contractSignedOn">{t('labelContractSigned')}</Label>
                  <Input
                    id="contractSignedOn"
                    type="date"
                    value={formData.contractSignedOn}
                    onChange={(e) => setFormData({ ...formData, contractSignedOn: e.target.value })}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hintContract')}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="startDate">
                  {formData.type === 'MIGRATION' ? t('labelMigrationDate') : formData.type === 'OFFBOARDING' ? t('labelDepartureDate') : t('labelStartDate')}
                  {formData.type === 'ONBOARDING' && !isEdit && (
                    <span className="text-xs text-muted-foreground ml-1 font-normal">({t('optionalPending')})</span>
                  )}
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required={formData.type !== 'ONBOARDING'}
                  disabled={!canEdit}
                />
                {starter?.isPendingBoarding && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-amber-600 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{t('pendingBoardingStatus')}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">
                {t('labelExtraInfo')}
                {!canEdit && canEditExtraInfo && (
                  <span className="text-xs text-muted-foreground ml-2">{t('hintCanEditField')}</span>
                )}
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                disabled={!canEditExtraInfo}
                placeholder={canEditExtraInfo ? t('placeholderNotes') : t('placeholderNoNotes')}
              />
            </div>

            {/* Signature Generator Button */}
            {canGenerateSignature && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FileSignature className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      {t('signatureTitle')}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      {t('signatureDescription')}
                    </p>
                    <Button
                      type="button"
                      onClick={() => setSignatureDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                      size="sm"
                    >
                      <FileSignature className="h-4 w-4 mr-2" />
                      {t('generateSignature')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Contactgegevens */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phoneNumber">
                  {t('labelPhone')}
                  {!canEditContactInfo && isEdit && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {t('hintITOnly')}
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+32 123 45 67 89"
                    disabled={!canEditContactInfo}
                    className="flex-1"
                  />
                  {formData.phoneNumber && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy('phone')}
                      className="shrink-0"
                      title={t('copyPhone')}
                    >
                      {copiedField === 'phone' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.phoneNumber 
                    ? copiedField === 'phone' 
                      ? t('copied') 
                      : t('clickToCopy')
                    : t('hintPhoneOptional')}
                </p>
                {isEdit && phoneTask && formData.type === 'ONBOARDING' && (
                  <div className={`flex items-center gap-2 mt-2 p-2 rounded-md border ${
                    isPhoneTaskCompleted
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                      : isPhoneTaskRequested 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' 
                        : 'bg-muted/50'
                  }`}>
                    <Checkbox
                      id="phoneTaskRequested"
                      checked={isPhoneTaskRequested || isPhoneTaskCompleted}
                      onCheckedChange={handleTogglePhoneTask}
                      disabled={!isPhoneTaskAssignee || phoneTaskToggling || isPhoneTaskCompleted}
                    />
                    <label
                      htmlFor="phoneTaskRequested"
                      className={`text-xs cursor-pointer select-none flex-1 ${
                        isPhoneTaskCompleted ? 'text-green-700 dark:text-green-300 line-through' : 
                        isPhoneTaskRequested ? 'text-blue-700 dark:text-blue-300' : ''
                      } ${!isPhoneTaskAssignee || isPhoneTaskCompleted ? 'cursor-default' : ''}`}
                    >
                      {isPhoneTaskCompleted ? t('phoneTaskCompleted') : t('phoneTaskLabel')}
                    </label>
                    {phoneTask.assignedTo && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {phoneTask.assignedTo.name || phoneTask.assignedTo.email}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="desiredEmail">
                  {t('labelDesiredEmail')}
                  {!canEditContactInfo && isEdit && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {t('hintITOnly')}
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="desiredEmail"
                    type="email"
                    value={formData.desiredEmail}
                    onChange={(e) => setFormData({ ...formData, desiredEmail: e.target.value })}
                    placeholder="voornaam.achternaam@bedrijf.be"
                    disabled={!canEditContactInfo}
                    className="flex-1"
                  />
                  {formData.desiredEmail && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy('email')}
                      className="shrink-0"
                      title={t('copyEmail')}
                    >
                      {copiedField === 'email' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.desiredEmail 
                    ? copiedField === 'email' 
                      ? t('copied') 
                      : t('clickToCopy')
                    : t('hintEmailSuggested')}
                </p>
                {isEdit && emailTask && formData.type === 'ONBOARDING' && (
                  <div className={`flex items-center gap-2 mt-2 p-2 rounded-md border ${
                    isEmailTaskCompleted 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                      : 'bg-muted/50'
                  }`}>
                    <Checkbox
                      id="emailTaskComplete"
                      checked={isEmailTaskCompleted}
                      onCheckedChange={handleToggleEmailTask}
                      disabled={!isEmailTaskAssignee || emailTaskToggling}
                    />
                    <label
                      htmlFor="emailTaskComplete"
                      className={`text-xs cursor-pointer select-none flex-1 ${
                        isEmailTaskCompleted ? 'text-green-700 dark:text-green-300 line-through' : ''
                      } ${!isEmailTaskAssignee ? 'cursor-default' : ''}`}
                    >
                      {t('emailTaskLabel')}
                    </label>
                    {emailTask.assignedTo && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {emailTask.assignedTo.name || emailTask.assignedTo.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Ervaring sectie (alleen voor onboarding) */}
            {formData.type === 'ONBOARDING' && (
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="hasExperience"
                  checked={formData.hasExperience}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      hasExperience: checked as boolean,
                      // Reset ervaring velden als uitgevinkt
                      experienceSince: checked ? formData.experienceSince : '',
                      experienceRole: checked ? formData.experienceRole : '',
                      experienceEntity: checked ? formData.experienceEntity : '',
                    })
                  }
                  disabled={!canEdit}
                />
                <Label htmlFor="hasExperience" className="font-medium cursor-pointer">
                  {t('labelHasExperience')}
                </Label>
              </div>

              {formData.hasExperience && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div>
                    <Label htmlFor="experienceSince">
                      Ervaring sinds *
                      {formData.experienceSince && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({getExperienceText(formData.experienceSince)})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="experienceSince"
                      type="date"
                      value={formData.experienceSince}
                      onChange={(e) => setFormData({ ...formData, experienceSince: e.target.value })}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      disabled={!canEdit}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Datum waarop de starter begon met deze functie/ervaring
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="experienceRole">{t('labelExperienceRole')}</Label>
                    <Input
                      id="experienceRole"
                      value={formData.experienceRole}
                      onChange={(e) => setFormData({ ...formData, experienceRole: e.target.value })}
                      placeholder={t('placeholderExperienceRole')}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label htmlFor="experienceEntity">{t('labelExperienceEntity')}</Label>
                    <Input
                      id="experienceEntity"
                      value={formData.experienceEntity}
                      onChange={(e) => setFormData({ ...formData, experienceEntity: e.target.value })}
                      placeholder={t('placeholderExperienceEntity')}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Materialen sectie (alleen bij edit) */}
            {isEdit && starterMaterials.length > 0 && (
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  {t('materialsTitle')}
                </Label>
                <div className="space-y-2">
                  {starterMaterials.map((sm: any) => (
                    <div
                      key={sm.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          id={`material-${sm.materialId}`}
                          checked={sm.isProvided}
                          onCheckedChange={(checked) =>
                            handleMaterialToggle(sm.materialId, checked as boolean)
                          }
                          disabled={!canEdit}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`material-${sm.materialId}`}
                            className="cursor-pointer font-normal"
                          >
                            {sm.material.name}
                            {sm.material.category && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {sm.material.category}
                              </Badge>
                            )}
                          </Label>
                          {sm.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {sm.notes}
                            </p>
                          )}
                          {sm.isProvided && sm.providedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('materialsProvided')}{' '}
                              {new Date(sm.providedAt).toLocaleDateString('nl-BE', {
                                dateStyle: 'short',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {t('materialsCheckbox')}
                  </p>
                )}
              </div>
            )}

            {/* Taken sectie (alleen bij edit) */}
            {isEdit && tasks.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">
                    {t('tasksTitle', { count: tasks.length })}
                  </Label>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={handleRegenerateTasks}
                      disabled={regeneratingTasks}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1.5 ${regeneratingTasks ? 'animate-spin' : ''}`} />
                      {t('regenerateTasks')}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {task.status === 'COMPLETED' ? (
                            <span className="text-green-500">✓</span>
                          ) : task.priority === 'URGENT' ? (
                            <span className="text-red-500">🚨</span>
                          ) : task.priority === 'HIGH' ? (
                            <span className="text-orange-500">⚠️</span>
                          ) : (
                            <span className="text-blue-500">📋</span>
                          )}
                          <span className={task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}>
                            {task.title}
                          </span>
                        </div>
                        {task.assignedTo && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {t('taskAssignedTo')} {task.assignedTo.name || task.assignedTo.email}
                          </p>
                        )}
                        {task.dueDate && task.status !== 'COMPLETED' && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {t('taskDeadline')} {new Date(task.dueDate).toLocaleDateString('nl-BE')}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={task.status === 'COMPLETED' ? 'outline' : 'default'}
                        className="text-xs"
                      >
                        {task.status === 'COMPLETED' ? t('taskCompleted') :
                         task.status === 'IN_PROGRESS' ? t('taskInProgress') :
                         task.status === 'BLOCKED' ? t('taskBlocked') : t('taskQueued')}
                      </Badge>
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {t('moreTasks', { count: tasks.length - 5 })}
                    </p>
                  )}
                </div>
                <a
                  href="/taken"
                  className="text-xs text-primary hover:underline mt-3 block"
                  target="_blank"
                >
                  {t('viewAllTasks')}
                </a>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                {canEdit && isEdit && !starter?.isCancelled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('cancelStarter')}
                  </Button>
                )}
                {canEdit && isEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tc('delete')}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose()}
                  disabled={loading}
                >
                  {tc('close')}
                </Button>
                {canEdit && !starter?.isCancelled && (
                  <Button type="submit" disabled={loading}>
                    {loading ? tc('saving') : isEdit ? tc('save') : tc('add')}
                  </Button>
                )}
                {!canEdit && canEditExtraInfo && isEdit && !starter?.isCancelled && (
                  <Button 
                    type="button" 
                    onClick={handleSaveExtraInfo} 
                    disabled={loading}
                  >
                    {loading ? tc('saving') : t('saveExtraInfo')}
                  </Button>
                )}
                {!canEdit && canEditContactInfo && isEdit && !starter?.isCancelled && (
                  <Button 
                    type="button" 
                    onClick={handleSaveContactInfo} 
                    disabled={loading}
                    variant="secondary"
                  >
                    {loading ? 'Bezig...' : 'Contact Gegevens Opslaan'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Signature Generator Dialog */}
    {canGenerateSignature && (
      <SignatureGeneratorDialog
        open={signatureDialogOpen}
        onClose={() => setSignatureDialogOpen(false)}
        starterData={{
          name: formData.name,
          roleTitle: formData.roleTitle,
          phoneNumber: formData.phoneNumber,
          desiredEmail: formData.desiredEmail,
        }}
        entityId={starter?.entity?.id || formData.entityId}
      />
    )}

    {/* Cancel Confirmation Dialog */}
    <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('cancelDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="cancelReason">{t('cancelReason')}</Label>
          <Textarea
            id="cancelReason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t('cancelReasonPlaceholder')}
            rows={3}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={loading}>
            {tc('back')}
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? tc('saving') : t('confirmCancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Pending Boarding Confirmation Dialog */}
    <Dialog open={pendingConfirmOpen} onOpenChange={setPendingConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            {t('pendingConfirmTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('pendingConfirmDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">
          <p>{t('pendingConfirmInfo')}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingConfirmOpen(false)} disabled={loading}>
            {tc('back')}
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              setPendingConfirmOpen(false)
              submitStarter(true)
            }}
            disabled={loading}
          >
            <Clock className="h-4 w-4 mr-2" />
            {loading ? tc('saving') : t('pendingConfirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}

