'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Info, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserCombobox } from '@/components/ui/user-combobox'

const TASK_TYPES = [
  'IT_SETUP',
  'HR_ADMIN',
  'FACILITIES',
  'MANAGER_ACTION',
  'CUSTOM',
  'MARKETING_PHOTO',
  'MARKETING_EDIT',
  'MARKETING_UTM',
  'MARKETING_VCARD',
  'MARKETING_VISITEKAARTJE',
  'MARKETING_BADGE',
  'MARKETING_NFC',
  'MARKETING_SIGNATURE',
] as const
const NOTIFY_CHANNELS = ['IN_APP', 'EMAIL', 'BOTH'] as const

export default function TaskAssignmentsPage() {
  const t = useTranslations('adminTaskAssignments')
  const tc = useTranslations('common')
  const tt = useTranslations('tasks')
  const taskTypeLabels: Record<string, string> = {
    IT_SETUP: tt('itSetup'),
    HR_ADMIN: tt('hrAdmin'),
    FACILITIES: tt('facilities'),
    MANAGER_ACTION: tt('managerAction'),
    CUSTOM: tt('custom'),
    MARKETING_PHOTO: tt('marketingPhoto'),
    MARKETING_EDIT: tt('marketingEdit'),
    MARKETING_UTM: tt('marketingUtm'),
    MARKETING_VCARD: tt('marketingVcard'),
    MARKETING_VISITEKAARTJE: tt('marketingVisitekaartje'),
    MARKETING_BADGE: tt('marketingBadge'),
    MARKETING_NFC: tt('marketingNfc'),
    MARKETING_SIGNATURE: tt('marketingSignature'),
  }
  const notifyChannelLabels: Record<string, string> = {
    IN_APP: t('inAppOnly'),
    EMAIL: t('emailOnly'),
    BOTH: t('inAppAndEmail'),
  }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignments, setAssignments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUserId, setEditUserId] = useState<string>('')
  const [editChannel, setEditChannel] = useState<string>('BOTH')

  // Reroute dialog state
  const [rerouteDialog, setRerouteDialog] = useState<{
    open: boolean
    assignmentId: string
    assigneeName: string
    openTaskCount: number
  }>({ open: false, assignmentId: '', assigneeName: '', openTaskCount: 0 })
  const [rerouting, setRerouting] = useState(false)

  // Form state voor nieuwe assignment
  const [selectedEntity, setSelectedEntity] = useState<string>('global')
  const [selectedTaskType, setSelectedTaskType] = useState<string>('IT_SETUP')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<string>('BOTH')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assignmentsRes, entitiesRes] = await Promise.all([
        fetch('/api/admin/task-assignments'),
        fetch('/api/entities'),
      ])

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json()
        console.log('Task assignments data:', data)
        console.log('Users:', data.users)
        setAssignments(data.assignments || [])
        setUsers(data.users || [])
      } else {
        console.error('Failed to fetch task assignments:', await assignmentsRes.text())
      }

      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json()
        setEntities(entitiesData.filter((e: any) => e.isActive))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedUser) {
      setMessage({ type: 'error', text: t('selectResponsible') })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const payload = {
        entityId: selectedEntity === 'global' ? null : selectedEntity,
        taskType: selectedTaskType,
        assignedToId: selectedUser,
        notifyChannel: selectedChannel,
      }

      console.log('💾 Saving task assignment:', payload)

      const res = await fetch('/api/admin/task-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log('📥 Response:', data)

      if (res.ok) {
        setMessage({ type: 'success', text: t('responsibleSaved') })
        fetchData()
        // Reset form
        setSelectedEntity('global')
        setSelectedTaskType('IT_SETUP')
        setSelectedUser('')
        setSelectedChannel('BOTH')
      } else {
        console.error('❌ Save failed:', data)
        setMessage({ 
          type: 'error', 
          text: `${tc('errorSaving')}: ${data.details || data.error || tc('unknown')}` 
        })
      }
    } catch (error) {
      console.error('❌ Exception during save:', error)
      setMessage({ type: 'error', text: `${tc('errorSaving')}: ${(error as Error).message}` })
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (assignment: any) => {
    setEditingId(assignment.id)
    setEditUserId(assignment.assignedToId)
    setEditChannel(assignment.notifyChannel)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditUserId('')
    setEditChannel('BOTH')
  }

  const handleUpdate = async (id: string) => {
    if (!editUserId) return

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/admin/task-assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToId: editUserId,
          notifyChannel: editChannel,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessage({ type: 'success', text: t('responsibleUpdated') })
        cancelEditing()
        fetchData()

        if (data.openTaskCount > 0) {
          const assigneeName = data.assignee?.name || data.assignee?.email || ''
          setRerouteDialog({
            open: true,
            assignmentId: id,
            assigneeName,
            openTaskCount: data.openTaskCount,
          })
        }
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: `${tc('errorSaving')}: ${data.details || data.error || tc('unknown')}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `${tc('errorSaving')}: ${(error as Error).message}` })
    } finally {
      setSaving(false)
    }
  }

  const handleReroute = async () => {
    setRerouting(true)
    try {
      const res = await fetch(`/api/admin/task-assignments/${rerouteDialog.assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rerouteTasks: true }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.reroutedCount > 0) {
          setMessage({
            type: 'success',
            text: t('tasksRerouted', { count: data.reroutedCount }),
          })
        } else {
          setMessage({ type: 'success', text: t('noTasksToReroute') })
        }
        fetchData()
        setRerouteDialog({ open: false, assignmentId: '', assigneeName: '', openTaskCount: 0 })
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: `${tc('errorSaving')}: ${data.details || data.error || tc('unknown')}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `${tc('errorSaving')}: ${(error as Error).message}` })
    } finally {
      setRerouting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteAssignment'))) {
      return
    }

    try {
      const res = await fetch(`/api/admin/task-assignments/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage({ type: 'success', text: t('responsibleDeleted') })
        fetchData()
      }
    } catch (error) {
      setMessage({ type: 'error', text: tc('errorDeleting') })
    }
  }

  const groupedAssignments = {
    global: assignments.filter((a) => !a.entityId),
    byEntity: entities.map((entity) => ({
      entity,
      assignments: assignments.filter((a) => a.entityId === entity.id),
    })),
  }

  const renderAssignmentRow = (assignment: any) => {
    const isEditing = editingId === assignment.id

    if (isEditing) {
      return (
        <div key={assignment.id} className="p-3 border rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{taskTypeLabels[assignment.taskType]}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">{t('responsible')}</Label>
              <UserCombobox
                users={users}
                value={editUserId}
                onChange={setEditUserId}
                placeholder={t('selectUser')}
                emptyLabel={t('noUsersFound')}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">{t('notificationChannel')}</Label>
              <Select value={editChannel} onValueChange={setEditChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(notifyChannelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleUpdate(assignment.id)}
              disabled={saving || !editUserId}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {saving ? tc('saving') : tc('save')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEditing}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {tc('cancel')}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div
        key={assignment.id}
        className="flex items-center justify-between p-3 border rounded-lg"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{taskTypeLabels[assignment.taskType]}</span>
            <Badge variant="outline">{notifyChannelLabels[assignment.notifyChannel]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {assignment.assignee?.name || assignment.assignee?.email}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startEditing(assignment)}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(assignment.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('howItWorks')}</strong> {t('howItWorksDescription')}
        </AlertDescription>
      </Alert>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* New Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('newAssignment')}</CardTitle>
          <CardDescription>
            {t('newAssignmentDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>{t('entityLabel')}</Label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">🌍 {t('globalAllEntities')}</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('taskTypeLabel')}</Label>
              <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('responsible')}</Label>
              <UserCombobox
                users={users}
                value={selectedUser}
                onChange={setSelectedUser}
                placeholder={t('selectUser')}
                emptyLabel={t('noUsersFound')}
              />
            </div>

            <div>
              <Label>{t('notificationChannel')}</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(notifyChannelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !selectedUser}
            className="mt-4"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? tc('saving') : tc('save')}
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <div className="space-y-6">
        {/* Global Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>🌍 {t('globalResponsibles')}</CardTitle>
            <CardDescription>
              {t('globalResponsiblesDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{tc('loading')}</p>
            ) : groupedAssignments.global.length === 0 ? (
              <p className="text-muted-foreground">{t('noGlobalResponsibles')}</p>
            ) : (
              <div className="space-y-2">
                {groupedAssignments.global.map(renderAssignmentRow)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity-specific Assignments */}
        {groupedAssignments.byEntity
          .filter((group) => group.assignments.length > 0)
          .map((group) => (
            <Card key={group.entity.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge
                    style={{
                      backgroundColor: group.entity.colorHex,
                      color: 'white',
                    }}
                  >
                    {group.entity.name}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {t('entitySpecificDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.assignments.map(renderAssignmentRow)}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Dialog
        open={rerouteDialog.open}
        onOpenChange={(open) => {
          if (!open && !rerouting) {
            setRerouteDialog({ open: false, assignmentId: '', assigneeName: '', openTaskCount: 0 })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rerouteDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('rerouteDialogDescription', {
                count: rerouteDialog.openTaskCount,
                name: rerouteDialog.assigneeName,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRerouteDialog({ open: false, assignmentId: '', assigneeName: '', openTaskCount: 0 })}
              disabled={rerouting}
            >
              {t('rerouteNo')}
            </Button>
            <Button onClick={handleReroute} disabled={rerouting}>
              <RefreshCw className={`h-4 w-4 mr-2 ${rerouting ? 'animate-spin' : ''}`} />
              {rerouting ? tc('saving') : t('rerouteYes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

