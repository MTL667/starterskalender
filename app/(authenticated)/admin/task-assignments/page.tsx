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
import { Info, Save, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const TASK_TYPES = ['IT_SETUP', 'HR_ADMIN', 'FACILITIES', 'MANAGER_ACTION', 'CUSTOM'] as const
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
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {t('noUsersFound')}
                    </div>
                  ) : (
                    users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                        {user.status !== 'ACTIVE' && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({user.status})
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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
                {groupedAssignments.global.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {taskTypeLabels[assignment.taskType]}
                        </span>
                        <Badge variant="outline">
                          {notifyChannelLabels[assignment.notifyChannel]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {assignment.assignee?.name || assignment.assignee?.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
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
                  {group.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {taskTypeLabels[assignment.taskType]}
                          </span>
                          <Badge variant="outline">
                            {notifyChannelLabels[assignment.notifyChannel]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {assignment.assignee?.name || assignment.assignee?.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

