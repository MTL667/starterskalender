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
import { Trash2, XCircle, Copy, Check, FileSignature, Search, UserCheck, PenLine, RefreshCw, Clock, AlertTriangle, Package, Loader2, ShoppingCart, ImageIcon, Cloud, CloudOff, Building2 } from 'lucide-react'
import { getExperienceText } from '@/lib/experience-utils'
import { useSession } from 'next-auth/react'
import { MaterialStatusStepper } from '@/components/materials/material-status-stepper'
import { MaterialActionButtons } from '@/components/materials/material-action-buttons'
import { GenerateMailButton } from '@/components/entra/GenerateMailButton'
import { SignatureGeneratorDialog } from '@/components/signature-generator-dialog'
import { HealthProgressBar } from '@/components/health-badge'
import { useHealthScores } from '@/lib/use-health-scores'
import { StarterAvatar } from '@/components/kalender/starter-avatar'
import { PhotoPickerDialog } from '@/components/kalender/photo-picker-dialog'
import { OffboardingSection } from '@/components/offboarding/OffboardingSection'

interface Starter {
  id: string
  type?: 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION'
  firstName: string
  lastName: string
  language?: string
  roleTitle?: string | null
  region?: string | null
  via?: string | null
  notes?: string | null
  contractSignedOn?: string | null
  startDate: string | null
  materialReturnDate?: string | null
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
  inspectorNumber?: number | null
  photoUploadId?: string | null
  photoDriveId?: string | null
  photoItemId?: string | null
  cardDavUid?: string | null
  cardDavSyncedAt?: string | null
  cardDavStatus?: string | null
  fromEntityId?: string | null
  fromRoleTitle?: string | null
  employmentType?: 'EMPLOYEE' | 'SUBCONTRACTOR' | 'CONSULTANT'
  companyName?: string | null
  vatNumber?: string | null
  companyStreet?: string | null
  companyNumber?: string | null
  companyBus?: string | null
  companyPostalCode?: string | null
  companyCity?: string | null
  companyCountry?: string | null
  legalForm?: string | null
  terminationInitiator?: 'ENTITY_TERMINATED' | 'MUTUAL_AGREEMENT' | 'EMPLOYEE_RESIGNED' | 'FORCE_MAJEURE' | null
  leaveReasonId?: string | null
  leaveReason?: { id: string; name: string } | null
  leaveReasonNote?: string | null
  entity?: {
    id: string
    name?: string
    colorHex?: string
    inspectorNumberEnabled?: boolean
    inspectorNumberLabel?: string
    cardDavEnabled?: boolean
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
  requiresInspectorNumber?: boolean
}

interface Employee {
  id: string
  name: string
  language: string
  roleTitle: string | null
  region: string | null
  phoneNumber: string | null
  desiredEmail: string | null
  employmentType: 'EMPLOYEE' | 'SUBCONTRACTOR' | 'CONSULTANT' | null
  companyName: string | null
  vatNumber: string | null
  companyStreet: string | null
  companyNumber: string | null
  companyBus: string | null
  companyPostalCode: string | null
  companyCity: string | null
  companyCountry: string | null
  legalForm: string | null
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
  const healthIds = starter ? [starter.id] : []
  const { scores: healthScores } = useHealthScores(healthIds)
  const healthScore = starter ? healthScores[starter.id] : undefined
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
  const [assigningMaterials, setAssigningMaterials] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoCacheBuster, setPhotoCacheBuster] = useState<number>(() => Date.now())
  // Override lokaal na een succesvolle refresh: als `starter.photoUploadId`
  // (uit de prop) nog niet gezet was, willen we toch direct de foto tonen.
  const [photoLinkedOverride, setPhotoLinkedOverride] = useState(false)
  const [cardDavSyncing, setCardDavSyncing] = useState(false)
  const [cardDavDeleting, setCardDavDeleting] = useState(false)
  const [cardDavSearching, setCardDavSearching] = useState(false)
  const [cardDavLocalStatus, setCardDavLocalStatus] = useState<string | null>(null)
  const [cardDavLocalSyncedAt, setCardDavLocalSyncedAt] = useState<string | null>(null)
  const [starterHasHealthyConnection, setStarterHasHealthyConnection] = useState(false)
  const [starterHasLicenseConfig, setStarterHasLicenseConfig] = useState(false)
  const [vatLookupLoading, setVatLookupLoading] = useState(false)
  const [vatLookupError, setVatLookupError] = useState<string | null>(null)
  const [vatLookupSuccess, setVatLookupSuccess] = useState(false)
  const [leaveReasons, setLeaveReasons] = useState<{ id: string; name: string }[]>([])
  const [newReasonName, setNewReasonName] = useState('')
  const [addingReason, setAddingReason] = useState(false)
  const [showNewReasonInput, setShowNewReasonInput] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [formData, setFormData] = useState({
    type: 'ONBOARDING' as 'ONBOARDING' | 'OFFBOARDING' | 'MIGRATION',
    employmentType: 'EMPLOYEE' as 'EMPLOYEE' | 'SUBCONTRACTOR' | 'CONSULTANT',
    firstName: '',
    lastName: '',
    language: 'NL',
    entityId: '',
    fromEntityId: '',
    fromRoleTitle: '',
    roleTitle: '',
    region: '',
    via: '',
    notes: '',
    contractSignedOn: '',
    startDate: '',
    materialReturnDate: '',
    hasExperience: false,
    experienceSince: '',
    experienceRole: '',
    experienceEntity: '',
    phoneNumber: '',
    desiredEmail: '',
    companyName: '',
    vatNumber: '',
    companyStreet: '',
    companyNumber: '',
    companyBus: '',
    companyPostalCode: '',
    companyCity: '',
    companyCountry: '',
    legalForm: '',
    terminationInitiator: '' as '' | 'ENTITY_TERMINATED' | 'MUTUAL_AGREEMENT' | 'EMPLOYEE_RESIGNED' | 'FORCE_MAJEURE',
    leaveReasonId: '',
    leaveReasonNote: '',
  })

  const userPerms: string[] = (session?.user as any)?.perms ?? []
  const isAdmin = userPerms.includes('admin:users:manage')
  const canSeeLeaveReason = isAdmin || userPerms.includes('starters:read:leavereason')
  const canManageReasons = isAdmin || userPerms.includes('offboarding:reasons:manage')

  // Check if user can edit extra info (notes)
  // Everyone except no-permission users can edit notes for entities they have access to
  const canEditExtraInfo = (() => {
    if (!session?.user) return false
    if (!session.user.perms?.length) return false

    // Admin can edit everything
    if (session.user.perms.includes('admin:users:manage')) return true
    
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
  // Only admin or IT_SETUP responsible can edit these fields
  const canEditContactInfo = (() => {
    if (!session?.user) return false

    if (session.user.perms?.includes('admin:users:manage')) return true
    
    // IT_SETUP verantwoordelijke can edit
    return isITResponsible
  })()

  // Close employee list on click outside
  useEffect(() => {
    if (starter) {
      setCardDavLocalStatus(starter.cardDavStatus || null)
      setCardDavLocalSyncedAt(starter.cardDavSyncedAt || null)
    } else {
      setCardDavLocalStatus(null)
      setCardDavLocalSyncedAt(null)
    }
  }, [starter])

  const handleCardDavSync = async () => {
    if (!starter) return
    setCardDavSyncing(true)
    try {
      const res = await fetch(`/api/starters/${starter.id}/carddav/sync`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setCardDavLocalStatus('SYNCED')
        setCardDavLocalSyncedAt(data.syncedAt)
      } else {
        alert(data.error || 'CardDAV sync mislukt')
      }
    } catch {
      alert('CardDAV sync mislukt')
    } finally {
      setCardDavSyncing(false)
    }
  }

  const handleCardDavDelete = async (mode: 'soft' | 'hard') => {
    if (!starter) return
    setCardDavDeleting(true)
    try {
      const res = await fetch(`/api/starters/${starter.id}/carddav/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: res.status >= 500
          ? `Server fout (${res.status}). Controleer de server logs voor details.`
          : `Onverwachte response (${res.status})` }
      }
      if (data.ok) {
        setCardDavLocalStatus(mode === 'soft' ? 'SOFT_DELETED' : 'DELETED')
      } else {
        alert(data.error || `CardDAV verwijdering mislukt (${res.status})`)
      }
    } catch (e) {
      alert(`CardDAV verwijdering mislukt: ${(e as Error).message}`)
    } finally {
      setCardDavDeleting(false)
    }
  }

  const handleCardDavSearch = async () => {
    if (!starter) return
    setCardDavSearching(true)
    try {
      const res = await fetch(`/api/starters/${starter.id}/carddav/search`, { method: 'POST' })
      const data = await res.json()
      if (data.ok && data.found) {
        setCardDavLocalStatus('SYNCED')
      } else if (data.ok && !data.found) {
        alert(t('cardDavSearchNotFound'))
      } else {
        alert(data.error || 'CardDAV zoeken mislukt')
      }
    } catch {
      alert('CardDAV zoeken mislukt')
    } finally {
      setCardDavSearching(false)
    }
  }

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

  useEffect(() => {
    if (formData.type === 'OFFBOARDING' && open && canSeeLeaveReason) {
      fetch('/api/leave-reasons')
        .then(res => res.ok ? res.json() : [])
        .then(data => setLeaveReasons(Array.isArray(data) ? data : []))
        .catch(() => setLeaveReasons([]))
    }
  }, [formData.type, open, canSeeLeaveReason])

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
    setPhotoLinkedOverride(false)
    setPhotoCacheBuster(Date.now())
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
        employmentType: starter.employmentType || 'EMPLOYEE',
        firstName: starter.firstName,
        lastName: starter.lastName,
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
        materialReturnDate: starter.materialReturnDate ? format(new Date(starter.materialReturnDate), 'yyyy-MM-dd') : '',
        hasExperience: starter.hasExperience || false,
        experienceSince: starter.experienceSince ? format(new Date(starter.experienceSince), 'yyyy-MM-dd') : '',
        experienceRole: starter.experienceRole || '',
        experienceEntity: starter.experienceEntity || '',
        phoneNumber: starter.phoneNumber || '',
        desiredEmail: starter.desiredEmail || '',
        companyName: starter.companyName || '',
        vatNumber: starter.vatNumber || '',
        companyStreet: starter.companyStreet || '',
        companyNumber: starter.companyNumber || '',
        companyBus: starter.companyBus || '',
        companyPostalCode: starter.companyPostalCode || '',
        companyCity: starter.companyCity || '',
        companyCountry: starter.companyCountry || '',
        legalForm: starter.legalForm || '',
        terminationInitiator: starter.terminationInitiator || '' as any,
        leaveReasonId: starter.leaveReasonId || '',
        leaveReasonNote: starter.leaveReasonNote || '',
      })
      setVatLookupError(null)
      setVatLookupSuccess(false)
    } else {
      setFormData({
        type: 'ONBOARDING',
        employmentType: 'EMPLOYEE',
        firstName: '',
        lastName: '',
        language: 'NL',
        entityId: '',
        fromEntityId: '',
        fromRoleTitle: '',
        roleTitle: '',
        region: '',
        via: '',
        notes: '',
        contractSignedOn: '',
        startDate: '',
        materialReturnDate: '',
        hasExperience: false,
        experienceSince: '',
        experienceRole: '',
        experienceEntity: '',
        phoneNumber: '',
        desiredEmail: '',
        companyName: '',
        vatNumber: '',
        companyStreet: '',
        companyNumber: '',
        companyBus: '',
        companyPostalCode: '',
        companyCity: '',
        companyCountry: '',
        legalForm: '',
        terminationInitiator: '' as any,
        leaveReasonId: '',
        leaveReasonNote: '',
      })
      setVatLookupError(null)
      setVatLookupSuccess(false)
      setManualEntry(false)
      setSelectedEmployee(null)
      setEmployeeSearch('')
      setShowEmployeeList(false)
      setShowNewReasonInput(false)
      setShowValidationErrors(false)
      setNewReasonName('')
    }
  }, [starter, open])

  useEffect(() => {
    if (!starter?.entity?.id || !open) {
      setStarterHasHealthyConnection(false)
      setStarterHasLicenseConfig(false)
      return
    }
    const entityId = starter.entity.id
    fetch(`/api/admin/entra-connection/${entityId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setStarterHasHealthyConnection(data?.consentStatus === 'healthy')
      })
      .catch(() => setStarterHasHealthyConnection(false))

    if (starter.roleTitle) {
      fetch(`/api/admin/license-config/by-entity?entityId=${entityId}&roleTitle=${encodeURIComponent(starter.roleTitle)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setStarterHasLicenseConfig(!!data?.skuId))
        .catch(() => setStarterHasLicenseConfig(false))
    }
  }, [starter?.entity?.id, starter?.roleTitle, open])

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeList(false)
    setEmployeeSearch('')
    const companyFields = (employee.employmentType === 'SUBCONTRACTOR' || employee.employmentType === 'CONSULTANT') ? {
      employmentType: employee.employmentType as 'SUBCONTRACTOR' | 'CONSULTANT',
      companyName: employee.companyName || '',
      vatNumber: employee.vatNumber || '',
      companyStreet: employee.companyStreet || '',
      companyNumber: employee.companyNumber || '',
      companyBus: employee.companyBus || '',
      companyPostalCode: employee.companyPostalCode || '',
      companyCity: employee.companyCity || '',
      companyCountry: employee.companyCountry || '',
      legalForm: employee.legalForm || '',
    } : {
      employmentType: 'EMPLOYEE' as const,
      companyName: '',
      vatNumber: '',
      companyStreet: '',
      companyNumber: '',
      companyBus: '',
      companyPostalCode: '',
      companyCity: '',
      companyCountry: '',
      legalForm: '',
    }
    if (formData.type === 'MIGRATION') {
      setFormData(prev => ({
        ...prev,
        firstName: employee.name?.split(' ')[0] || '',
        lastName: employee.name?.split(' ').slice(1).join(' ') || '',
        language: employee.language || 'NL',
        fromEntityId: employee.entity?.id || '',
        fromRoleTitle: employee.roleTitle || '',
        region: employee.region || '',
        phoneNumber: employee.phoneNumber || '',
        desiredEmail: employee.desiredEmail || '',
        entityId: '',
        roleTitle: '',
        ...companyFields,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        firstName: employee.name?.split(' ')[0] || '',
        lastName: employee.name?.split(' ').slice(1).join(' ') || '',
        language: employee.language || 'NL',
        entityId: employee.entity?.id || '',
        roleTitle: employee.roleTitle || '',
        region: employee.region || '',
        phoneNumber: employee.phoneNumber || '',
        desiredEmail: employee.desiredEmail || '',
        ...companyFields,
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

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return
    }

    if (formData.type === 'OFFBOARDING' && canSeeLeaveReason && !formData.terminationInitiator) {
      setShowValidationErrors(true)
      document.getElementById('terminationInitiator')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // For new ONBOARDING starters without startDate, show pending boarding confirmation
    if (!isEdit && formData.type === 'ONBOARDING' && !formData.startDate) {
      setPendingConfirmOpen(true)
      return
    }

    await submitStarter(false)
  }

  const handleAddNewReason = async () => {
    const name = newReasonName.trim()
    if (!name) return
    setAddingReason(true)
    try {
      const res = await fetch('/api/leave-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const reason = await res.json()
        setLeaveReasons(prev => [...prev, { id: reason.id, name: reason.name }].sort((a, b) => a.name.localeCompare(b.name)))
        setFormData(prev => ({ ...prev, leaveReasonId: reason.id }))
        setShowNewReasonInput(false)
        setNewReasonName('')
      } else if (res.status === 409) {
        setNewReasonName('')
        setShowNewReasonInput(false)
        const updated = await fetch('/api/leave-reasons').then(r => r.json())
        if (Array.isArray(updated)) setLeaveReasons(updated)
      }
    } catch (err) {
      console.error('Error creating leave reason:', err)
    } finally {
      setAddingReason(false)
    }
  }

  const handleVatLookup = async () => {
    const vatNumber = formData.vatNumber.trim()
    if (!vatNumber) return

    setVatLookupLoading(true)
    setVatLookupError(null)
    setVatLookupSuccess(false)

    try {
      const res = await fetch(`/api/vat-lookup?vatNumber=${encodeURIComponent(vatNumber)}`)
      const result = await res.json()

      if (!result.valid) {
        setVatLookupError(result.error === 'Invalid VAT number' ? t('vatLookupInvalid') : t('vatLookupError'))
        return
      }

      setFormData(prev => ({
        ...prev,
        companyName: result.companyName || prev.companyName,
        companyStreet: result.address?.street || prev.companyStreet,
        companyNumber: result.address?.number || prev.companyNumber,
        companyPostalCode: result.address?.postalCode || prev.companyPostalCode,
        companyCity: result.address?.city || prev.companyCity,
        companyCountry: result.address?.country || prev.companyCountry,
        legalForm: result.legalForm || prev.legalForm,
      }))
      setVatLookupSuccess(true)
    } catch {
      setVatLookupError(t('vatLookupError'))
    } finally {
      setVatLookupLoading(false)
    }
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
        firstName: formData.firstName,
        lastName: formData.lastName,
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
        materialReturnDate: formData.type === 'OFFBOARDING' && formData.materialReturnDate
          ? new Date(formData.materialReturnDate).toISOString() : null,
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

      if (!isEdit) {
        data.employmentType = formData.employmentType
        if (formData.employmentType === 'SUBCONTRACTOR' || formData.employmentType === 'CONSULTANT') {
          data.companyName = formData.companyName || null
          data.vatNumber = formData.vatNumber || null
          data.companyStreet = formData.companyStreet || null
          data.companyNumber = formData.companyNumber || null
          data.companyBus = formData.companyBus || null
          data.companyPostalCode = formData.companyPostalCode || null
          data.companyCity = formData.companyCity || null
          data.companyCountry = formData.companyCountry || null
          data.legalForm = formData.legalForm || null
        }
      } else if (formData.employmentType === 'SUBCONTRACTOR' || formData.employmentType === 'CONSULTANT') {
        data.companyName = formData.companyName || null
        data.vatNumber = formData.vatNumber || null
        data.companyStreet = formData.companyStreet || null
        data.companyNumber = formData.companyNumber || null
        data.companyBus = formData.companyBus || null
        data.companyPostalCode = formData.companyPostalCode || null
        data.companyCity = formData.companyCity || null
        data.companyCountry = formData.companyCountry || null
        data.legalForm = formData.legalForm || null
      }

      if (formData.type === 'OFFBOARDING' && canSeeLeaveReason) {
        data.terminationInitiator = formData.terminationInitiator || null
        data.leaveReasonId = formData.leaveReasonId || null
        data.leaveReasonNote = formData.leaveReasonNote || null
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

  const handleMaterialStatusChange = async (materialId: string, status: string, expectedDeliveryDate?: string) => {
    if (!starter) return

    try {
      const res = await fetch(`/api/starters/${starter.id}/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, expectedDeliveryDate }),
      })

      if (res.ok) {
        const materialsRes = await fetch(`/api/starters/${starter.id}/materials`)
        if (materialsRes.ok) {
          setStarterMaterials(await materialsRes.json())
        }
      }
    } catch (error) {
      console.error('Error updating material status:', error)
      alert(t('errorMaterial'))
    }
  }

  const handleMaterialProvisionToggle = async (materialId: string, currentProvision: string) => {
    if (!starter) return
    const newProvision = currentProvision === 'SELF_PROVIDED' ? 'ENTITY_PROVIDED' : 'SELF_PROVIDED'
    try {
      const res = await fetch(`/api/starters/${starter.id}/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialProvision: newProvision }),
      })
      if (res.ok) {
        const materialsRes = await fetch(`/api/starters/${starter.id}/materials`)
        if (materialsRes.ok) {
          setStarterMaterials(await materialsRes.json())
        }
      }
    } catch (error) {
      console.error('Error toggling material provision:', error)
    }
  }

  const handleMaterialDelete = async (materialId: string) => {
    if (!starter) return
    try {
      const res = await fetch(`/api/starters/${starter.id}/materials/${materialId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setStarterMaterials(prev => prev.filter((sm: any) => sm.materialId !== materialId))
      }
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  const handleAssignMaterials = async () => {
    if (!starter) return
    setAssigningMaterials(true)
    try {
      const res = await fetch(`/api/starters/${starter.id}/materials`, {
        method: 'POST',
      })
      if (res.ok) {
        const materialsRes = await fetch(`/api/starters/${starter.id}/materials`)
        if (materialsRes.ok) {
          setStarterMaterials(await materialsRes.json())
        }
      }
    } catch (error) {
      console.error('Error assigning materials:', error)
      alert(t('errorMaterial'))
    } finally {
      setAssigningMaterials(false)
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

  const isMaterialMgr =
    userPerms.includes('materials:manage') || userPerms.includes('admin:users:manage')
  const canManagePhoto = isAdmin || userPerms.includes('starters:photo:manage')
  const canEditInspectorNumber = isAdmin || userPerms.includes('starters:write:inspectornumber')

  const handleRegenerateTasks = async (mode: 'append' | 'reset' = 'append') => {
    if (!starter || regeneratingTasks) return
    if (mode === 'reset' && !confirm(t('regenerateTasksConfirmReset'))) return
    setRegeneratingTasks(true)
    try {
      const res = await fetch(`/api/starters/${starter.id}/regenerate-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (res.ok) {
        const result = await res.json()
        if (mode === 'append') {
          if (result.created === 0) {
            alert(t('regenerateTasksNoneMissing'))
          } else {
            alert(t('regenerateTasksAppended', { count: result.created }))
          }
        } else {
          alert(t('regenerateTasksResetDone', { count: result.created, deleted: result.deleted }))
        }
        const tasksRes = await fetch(`/api/tasks?starterId=${starter.id}`)
        if (tasksRes.ok) {
          const newTasks = await tasksRes.json()
          setTasks(newTasks)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Error regenerating tasks')
      }
    } catch (error) {
      console.error('Error regenerating tasks:', error)
    } finally {
      setRegeneratingTasks(false)
    }
  }

  const handlePhotoPicked = () => {
    setPhotoCacheBuster(Date.now())
    setPhotoLinkedOverride(true)
  }

  // Check of alle velden voor signature generatie ingevuld zijn en template bestaat
  const canGenerateSignature = !!(
    hasSignatureTemplate &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.roleTitle &&
    formData.phoneNumber &&
    formData.desiredEmail
  )

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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

        {isEdit && starter && (
          <div className="flex items-center gap-4 pb-2">
            <StarterAvatar
              starterId={starter.id}
              firstName={starter.firstName}
              lastName={starter.lastName}
              hasPhoto={
                !!starter.photoUploadId ||
                (!!starter.photoDriveId && !!starter.photoItemId) ||
                photoLinkedOverride
              }
              entityColor={starter.entity?.colorHex ?? null}
              cacheBuster={photoCacheBuster}
            />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold leading-tight truncate">
                {starter.firstName} {starter.lastName}
              </div>
              {starter.roleTitle && (
                <div className="text-sm text-muted-foreground truncate">
                  {starter.roleTitle}
                  {starter.entity?.name && ` · ${starter.entity.name}`}
                </div>
              )}
            </div>
            {canManagePhoto && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPhotoPickerOpen(true)}
                title="Kies een profielfoto uit de SharePoint-map van deze starter"
              >
                <ImageIcon className="h-3 w-3 mr-1.5" />
                Foto kiezen
              </Button>
            )}
          </div>
        )}

        {isEdit && healthScore && !starter?.isCancelled && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <HealthProgressBar score={healthScore} starterType={starter?.type} />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="employmentType">{t('employmentType')}</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value: 'EMPLOYEE' | 'SUBCONTRACTOR' | 'CONSULTANT') => {
                    setFormData({
                      ...formData,
                      employmentType: value,
                      ...(value === 'EMPLOYEE'
                        ? { companyName: '', vatNumber: '', companyStreet: '', companyNumber: '', companyBus: '', companyPostalCode: '', companyCity: '', companyCountry: '', legalForm: '' }
                        : {}),
                    })
                    setVatLookupError(null)
                    setVatLookupSuccess(false)
                  }}
                  disabled={isEdit || !!selectedEmployee}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">{t('employee')}</SelectItem>
                    <SelectItem value="SUBCONTRACTOR">{t('subcontractor')}</SelectItem>
                    <SelectItem value="CONSULTANT">{t('consultant')}</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>

            {(formData.employmentType === 'SUBCONTRACTOR' || formData.employmentType === 'CONSULTANT') && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <div className="text-sm font-medium">{t('companyDetails')}</div>
                <div>
                  <Label htmlFor="vatNumber">{t('vatNumber')}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="vatNumber"
                      value={formData.vatNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, vatNumber: e.target.value })
                        setVatLookupError(null)
                        setVatLookupSuccess(false)
                      }}
                      placeholder="BE0123456789"
                      disabled={!canEdit}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVatLookup}
                      disabled={!canEdit || vatLookupLoading || !formData.vatNumber.trim()}
                    >
                      {vatLookupLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t('vatLookup')
                      )}
                    </Button>
                  </div>
                  {vatLookupLoading && (
                    <p className="text-xs text-muted-foreground mt-1">{t('vatLookupLoading')}</p>
                  )}
                  {vatLookupError && (
                    <p className="text-xs text-destructive mt-1">{vatLookupError}</p>
                  )}
                  {vatLookupSuccess && !vatLookupError && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('vatLookupSuccess')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="companyName">{t('companyName')}</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-3">
                    <Label htmlFor="companyStreet">{t('companyStreet')}</Label>
                    <Input
                      id="companyStreet"
                      value={formData.companyStreet}
                      onChange={(e) => setFormData({ ...formData, companyStreet: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="companyNumber">{t('companyNumber')}</Label>
                    <Input
                      id="companyNumber"
                      value={formData.companyNumber}
                      onChange={(e) => setFormData({ ...formData, companyNumber: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="companyBus">{t('companyBus')}</Label>
                    <Input
                      id="companyBus"
                      value={formData.companyBus}
                      placeholder={t('companyBusPlaceholder')}
                      onChange={(e) => setFormData({ ...formData, companyBus: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="companyPostalCode">{t('companyPostalCode')}</Label>
                    <Input
                      id="companyPostalCode"
                      value={formData.companyPostalCode}
                      onChange={(e) => setFormData({ ...formData, companyPostalCode: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="companyCity">{t('companyCity')}</Label>
                    <Input
                      id="companyCity"
                      value={formData.companyCity}
                      onChange={(e) => setFormData({ ...formData, companyCity: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="companyCountry">{t('companyCountry')}</Label>
                    <Input
                      id="companyCountry"
                      value={formData.companyCountry}
                      onChange={(e) => setFormData({ ...formData, companyCountry: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="legalForm">{t('legalForm')}</Label>
                  <Input
                    id="legalForm"
                    value={formData.legalForm}
                    onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            )}

            <div>
              {(formData.type === 'OFFBOARDING' || formData.type === 'MIGRATION') && !isEdit && !manualEntry ? (
                <div className="space-y-2">
                  <Label htmlFor="employeeSearch">{t('labelName')}</Label>
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
                          setFormData(prev => ({ ...prev, firstName: '', lastName: '', language: 'NL', entityId: '', fromEntityId: '', fromRoleTitle: '', roleTitle: '', region: '', phoneNumber: '', desiredEmail: '' }))
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
                                  <div className="font-medium truncate flex items-center gap-1">
                                    {emp.name}
                                    {(emp.employmentType === 'SUBCONTRACTOR' || emp.employmentType === 'CONSULTANT') && (
                                      <span title={emp.employmentType === 'CONSULTANT' ? t('consultant') : t('subcontractor')}>
                                        <Building2 className="h-3 w-3 text-orange-500 shrink-0" />
                                      </span>
                                    )}
                                  </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('labelFirstName')}</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('labelLastName')}</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                  {(formData.type === 'OFFBOARDING' || formData.type === 'MIGRATION') && !isEdit && manualEntry && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground mt-1"
                      onClick={() => {
                        setManualEntry(false)
                        setFormData(prev => ({ ...prev, firstName: '', lastName: '', language: 'NL', entityId: '', fromEntityId: '', fromRoleTitle: '', roleTitle: '', region: '', phoneNumber: '', desiredEmail: '' }))
                      }}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      {t('selectFromList')}
                    </Button>
                  )}
                </div>
              )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className={`grid gap-4 ${formData.type === 'ONBOARDING' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
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

            {isEdit && starter?.inspectorNumber != null && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">
                  {starter.entity?.inspectorNumberLabel || 'Inspecteurnummer'}
                </span>
                {(formData as any)._editingInspectorNumber ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      min={1}
                      defaultValue={starter.inspectorNumber}
                      className="font-mono w-32"
                      onChange={(e) => setFormData({ ...formData, inspectorNumber: parseInt(e.target.value) || null } as any)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading}
                      onClick={async () => {
                        const num = (formData as any).inspectorNumber
                        if (!num || !starter?.id) return
                        setLoading(true)
                        try {
                          const res = await fetch(`/api/starters/${starter.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ inspectorNumber: num }),
                          })
                          if (!res.ok) {
                            const err = await res.json()
                            alert(err.error || 'Fout bij opslaan')
                            return
                          }
                          onClose(true)
                        } catch {
                          alert('Fout bij opslaan')
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      {loading ? 'Bezig...' : 'Opslaan'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, _editingInspectorNumber: undefined, inspectorNumber: undefined } as any)}
                    >
                      Annuleren
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-mono text-lg font-semibold">{starter.inspectorNumber}</span>
                    {canEditInspectorNumber && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground"
                        onClick={() => setFormData({ ...formData, _editingInspectorNumber: true } as any)}
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {isEdit && canEditInspectorNumber && starter?.inspectorNumber == null && starter?.type !== 'OFFBOARDING' && starter?.entity?.inspectorNumberEnabled && (() => {
              const currentRole = jobRoles.find(r => r.title === starter?.roleTitle)
              if (!currentRole?.requiresInspectorNumber) return null
              return (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
                  <Label htmlFor="inspectorNumber" className="text-sm font-medium">
                    {starter.entity?.inspectorNumberLabel || 'Inspecteurnummer'}
                    <span className="text-xs text-muted-foreground ml-2">(nog niet toegekend)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="inspectorNumber"
                      type="number"
                      min={1}
                      placeholder="Voer nummer in of laat automatisch toekennen"
                      className="font-mono"
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null
                        setFormData({ ...formData, inspectorNumber: val } as any)
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={loading}
                      onClick={async () => {
                        if (!starter?.id || !starter?.entity?.id) return
                        setLoading(true)
                        try {
                          const manualNum = (formData as any).inspectorNumber
                          if (manualNum) {
                            const res = await fetch(`/api/starters/${starter.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ inspectorNumber: manualNum }),
                            })
                            if (!res.ok) {
                              const err = await res.json()
                              alert(err.error || 'Fout bij opslaan')
                              return
                            }
                          } else {
                            const res = await fetch(`/api/starters/${starter.id}/assign-inspector-number`, {
                              method: 'POST',
                            })
                            if (!res.ok) {
                              const err = await res.json()
                              alert(err.error || 'Fout bij toekennen')
                              return
                            }
                          }
                          onClose(true)
                        } catch {
                          alert('Fout bij toekennen inspecteurnummer')
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      {loading ? 'Bezig...' : (formData as any).inspectorNumber ? 'Opslaan' : 'Auto toekennen'}
                    </Button>
                  </div>
                </div>
              )
            })()}

            {formData.type === 'OFFBOARDING' && (
              <div>
                <Label htmlFor="materialReturnDate">{t('labelMaterialReturnDate')}</Label>
                <Input
                  id="materialReturnDate"
                  type="date"
                  value={formData.materialReturnDate}
                  onChange={(e) => setFormData({ ...formData, materialReturnDate: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
            )}

            {formData.type === 'OFFBOARDING' && canSeeLeaveReason && (
              <>
                <div>
                  <Label htmlFor="terminationInitiator">{t('labelTerminationInitiator')} *</Label>
                  <Select
                    value={formData.terminationInitiator}
                    onValueChange={(v) => {
                      setFormData({ ...formData, terminationInitiator: v as any })
                      setShowValidationErrors(false)
                    }}
                    disabled={!canEdit}
                  >
                    <SelectTrigger id="terminationInitiator" className={showValidationErrors && !formData.terminationInitiator ? 'border-red-500 ring-red-500' : ''}>
                      <SelectValue placeholder={t('selectTerminationInitiator')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTITY_TERMINATED">{t('entityTerminated')}</SelectItem>
                      <SelectItem value="MUTUAL_AGREEMENT">{t('mutualAgreement')}</SelectItem>
                      <SelectItem value="EMPLOYEE_RESIGNED">{t('employeeResigned')}</SelectItem>
                      <SelectItem value="FORCE_MAJEURE">{t('forceMajeure')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {showValidationErrors && !formData.terminationInitiator && (
                    <p className="text-xs text-red-500 mt-1">{t('terminationInitiatorRequired')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="leaveReasonId">{t('labelLeaveReason')}</Label>
                  {!showNewReasonInput ? (
                    <div className="flex gap-2">
                      <Select
                        value={formData.leaveReasonId}
                        onValueChange={(v) => {
                          if (v === '__new__') {
                            setShowNewReasonInput(true)
                          } else {
                            setFormData({ ...formData, leaveReasonId: v })
                          }
                        }}
                        disabled={!canEdit}
                      >
                        <SelectTrigger id="leaveReasonId" className="flex-1">
                          <SelectValue placeholder={t('selectLeaveReason')} />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveReasons.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                          {canManageReasons && (
                            <SelectItem value="__new__" className="text-blue-600 font-medium">
                              + {t('addNewReason')}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={newReasonName}
                        onChange={(e) => setNewReasonName(e.target.value)}
                        placeholder={t('newReasonPlaceholder')}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddNewReason()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddNewReason}
                        disabled={addingReason || !newReasonName.trim()}
                      >
                        {addingReason ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShowNewReasonInput(false); setNewReasonName('') }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="leaveReasonNote">{t('labelLeaveReasonNote')}</Label>
                  <Textarea
                    id="leaveReasonNote"
                    value={formData.leaveReasonNote}
                    onChange={(e) => setFormData({ ...formData, leaveReasonNote: e.target.value })}
                    rows={2}
                    disabled={!canEdit}
                    placeholder={t('placeholderLeaveReasonNote')}
                  />
                </div>
              </>
            )}

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

            {/* Mail Provisioning */}
            {isEdit && starter?.entity && formData.type === 'ONBOARDING' && (
              <div className="border-t pt-4">
                <GenerateMailButton
                  starterId={starter.id}
                  entityId={starter.entity.id}
                  hasHealthyConnection={starterHasHealthyConnection}
                  hasLicenseConfig={starterHasLicenseConfig}
                  canEdit={canEdit}
                />
              </div>
            )}

            {/* Mail Offboarding */}
            {isEdit && starter?.entity && formData.type === 'OFFBOARDING' && starterHasHealthyConnection && (
              <div className="border-t pt-4">
                <OffboardingSection
                  starterId={starter.id}
                  hasPermission={userPerms.includes('mail:offboarding') || isAdmin}
                  entityId={starter.entity.id}
                  jobRoleId={jobRoles.find(r => r.title === formData.roleTitle)?.id}
                  jobRoleTitle={formData.roleTitle || undefined}
                />
              </div>
            )}

            {/* CardDAV sync sectie */}
            {isEdit && starter?.entity?.cardDavEnabled && (formData.phoneNumber || formData.desiredEmail || formData.type === 'OFFBOARDING') && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('cardDavTitle')}</span>
                    {cardDavLocalStatus === 'SYNCED' && (
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800">
                        {t('cardDavSynced')}
                        {cardDavLocalSyncedAt && (
                          <span className="ml-1 text-xs opacity-70">
                            {format(new Date(cardDavLocalSyncedAt), 'dd/MM/yyyy HH:mm')}
                          </span>
                        )}
                      </Badge>
                    )}
                    {cardDavLocalStatus === 'OUTDATED' && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-300">
                        {t('cardDavOutdated')}
                      </Badge>
                    )}
                    {cardDavLocalStatus === 'ERROR' && (
                      <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 dark:bg-red-950/20 dark:text-red-300">
                        {t('cardDavError')}
                      </Badge>
                    )}
                    {cardDavLocalStatus === 'SOFT_DELETED' && (
                      <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-300">
                        {t('cardDavSoftDeleted')}
                      </Badge>
                    )}
                    {cardDavLocalStatus === 'DELETED' && (
                      <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50 dark:bg-gray-950/20 dark:text-gray-400">
                        {t('cardDavDeleted')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {session?.user?.perms?.includes('carddav:sync') && cardDavLocalStatus !== 'DELETED' && cardDavLocalStatus !== 'SOFT_DELETED' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCardDavSync}
                        disabled={cardDavSyncing}
                      >
                        {cardDavSyncing ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {cardDavLocalStatus === 'SYNCED' || cardDavLocalStatus === 'OUTDATED' || cardDavLocalStatus === 'ERROR'
                          ? t('cardDavResync')
                          : t('cardDavSync')}
                      </Button>
                    )}
                    {session?.user?.perms?.includes('carddav:delete') &&
                      formData.type === 'OFFBOARDING' &&
                      (!cardDavLocalStatus || cardDavLocalStatus === 'NONE' || cardDavLocalStatus === 'DELETED') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCardDavSearch}
                        disabled={cardDavSearching}
                      >
                        {cardDavSearching ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Search className="h-3 w-3 mr-1" />
                        )}
                        {t('cardDavSearch')}
                      </Button>
                    )}
                    {session?.user?.perms?.includes('carddav:delete') &&
                      formData.type === 'OFFBOARDING' &&
                      (cardDavLocalStatus === 'SYNCED' || cardDavLocalStatus === 'OUTDATED' || cardDavLocalStatus === 'SOFT_DELETED') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleCardDavDelete(cardDavLocalStatus === 'SOFT_DELETED' ? 'hard' : 'soft')}
                        disabled={cardDavDeleting}
                      >
                        {cardDavDeleting ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CloudOff className="h-3 w-3 mr-1" />
                        )}
                        {cardDavLocalStatus === 'SOFT_DELETED'
                          ? t('cardDavHardDelete')
                          : t('cardDavSoftDelete')}
                      </Button>
                    )}
                  </div>
                </div>
                {cardDavLocalStatus === 'SOFT_DELETED' && cardDavLocalSyncedAt && (
                  <p className="text-xs text-orange-600 mt-1">
                    {t('cardDavAutoDeleteNotice', {
                      date: format(
                        new Date(new Date(cardDavLocalSyncedAt).getTime() + 30 * 24 * 60 * 60 * 1000),
                        'dd/MM/yyyy',
                      ),
                    })}
                  </p>
                )}
              </div>
            )}

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
            {isEdit && (
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  {formData.type === 'OFFBOARDING' ? t('materialsReturnTitle') : t('materialsTitle')}
                </Label>

                {starterMaterials.length === 0 ? (
                  formData.type === 'OFFBOARDING' ? (
                  <p className="text-sm text-muted-foreground">
                    {t('noMaterialsOffboarding')}
                  </p>
                  ) : (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {t('noMaterialsWarning')}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {t('noMaterialsHint')}
                      </p>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={handleAssignMaterials}
                          disabled={assigningMaterials}
                        >
                          {assigningMaterials ? (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          ) : (
                            <Package className="mr-1.5 h-3 w-3" />
                          )}
                          {t('assignMaterials')}
                        </Button>
                      )}
                    </div>
                  </div>
                  )
                ) : (
                  <>
                    <div className="space-y-2">
                      {starterMaterials.map((sm: any) => (
                        <div
                          key={sm.id}
                          className="flex items-start justify-between p-3 border rounded-lg gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{sm.material.name}</span>
                              {sm.material.category && (
                                <Badge variant="outline" className="text-xs">
                                  {sm.material.category}
                                </Badge>
                              )}
                              {canEdit && isMaterialMgr ? (
                                <Badge
                                  variant={sm.materialProvision === 'SELF_PROVIDED' ? 'secondary' : 'default'}
                                  className="text-xs cursor-pointer select-none"
                                  onClick={() => handleMaterialProvisionToggle(sm.materialId, sm.materialProvision || 'ENTITY_PROVIDED')}
                                  title={t('toggleProvision')}
                                >
                                  {sm.materialProvision === 'SELF_PROVIDED' ? t('selfProvided') : t('entityProvided')}
                                </Badge>
                              ) : (
                                <Badge
                                  variant={sm.materialProvision === 'SELF_PROVIDED' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {sm.materialProvision === 'SELF_PROVIDED' ? t('selfProvided') : t('entityProvided')}
                                </Badge>
                              )}
                            </div>
                            {sm.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{sm.notes}</p>
                            )}
                            <div className="mt-2">
                              <MaterialStatusStepper
                                status={sm.status}
                                expectedDeliveryDate={sm.expectedDeliveryDate}
                                orderedAt={sm.orderedAt}
                                receivedAt={sm.receivedAt}
                                reservedAt={sm.reservedAt}
                                compact
                              />
                            </div>
                            {sm.status === 'ORDERED' && sm.expectedDeliveryDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Verwacht: {new Date(sm.expectedDeliveryDate).toLocaleDateString('nl-BE', { dateStyle: 'short' })}
                              </p>
                            )}
                          </div>
                          {canEdit && isMaterialMgr && (
                            <div className="flex items-center gap-1 shrink-0">
                              <MaterialActionButtons
                                status={sm.status}
                                materialId={sm.materialId}
                                onStatusChange={(status, deliveryDate) =>
                                  handleMaterialStatusChange(sm.materialId, status, deliveryDate)
                                }
                              />
                              {sm.status !== 'RESERVED' && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  title="Verwijderen — niet nodig voor deze starter"
                                  onClick={() => handleMaterialDelete(sm.materialId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Taken sectie (alleen bij edit) */}
            {isEdit && (tasks.length > 0 || isAdmin) && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <Label className="text-base font-semibold">
                    {t('tasksTitle', { count: tasks.length })}
                  </Label>
                  {isAdmin && !starter?.isCancelled && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleRegenerateTasks('append')}
                        disabled={regeneratingTasks}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1.5 ${regeneratingTasks ? 'animate-spin' : ''}`} />
                        {t('regenerateTasks')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => handleRegenerateTasks('reset')}
                        disabled={regeneratingTasks}
                        title={t('regenerateTasksReset')}
                      >
                        <RefreshCw className={`h-3 w-3 ${regeneratingTasks ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {tasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t('noTasksYet')}
                    </p>
                  )}
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

    {isEdit && starter && canManagePhoto && (
      <PhotoPickerDialog
        open={photoPickerOpen}
        onOpenChange={setPhotoPickerOpen}
        starterId={starter.id}
        currentItemId={starter.photoItemId ?? null}
        onPicked={handlePhotoPicked}
      />
    )}

    {/* Signature Generator Dialog */}
    {canGenerateSignature && (
      <SignatureGeneratorDialog
        open={signatureDialogOpen}
        onClose={() => setSignatureDialogOpen(false)}
        starterData={{
          name: `${formData.firstName} ${formData.lastName}`,
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

