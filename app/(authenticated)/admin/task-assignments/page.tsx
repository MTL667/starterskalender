'use client'

import { useState, useEffect } from 'react'
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

const taskTypeLabels: Record<string, string> = {
  IT_SETUP: '🖥️ IT Setup',
  HR_ADMIN: '📋 HR Administratie',
  FACILITIES: '🏢 Facilities',
  MANAGER_ACTION: '👥 Manager Actie',
  CUSTOM: '⚙️ Custom',
}

const notifyChannelLabels: Record<string, string> = {
  IN_APP: 'Alleen in-app',
  EMAIL: 'Alleen email',
  BOTH: 'In-app + Email',
}

export default function TaskAssignmentsPage() {
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
        setAssignments(data.assignments || [])
        setUsers(data.users || [])
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
      setMessage({ type: 'error', text: 'Selecteer een verantwoordelijke' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/task-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: selectedEntity === 'global' ? null : selectedEntity,
          taskType: selectedTaskType,
          assignedToId: selectedUser,
          notifyChannel: selectedChannel,
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Verantwoordelijke opgeslagen!' })
        fetchData()
        // Reset form
        setSelectedEntity('global')
        setSelectedTaskType('IT_SETUP')
        setSelectedUser('')
        setSelectedChannel('BOTH')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fout bij opslaan' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze assignment wilt verwijderen?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/task-assignments/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Verantwoordelijke verwijderd' })
        fetchData()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Fout bij verwijderen' })
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
        <h1 className="text-3xl font-bold">Taak Verantwoordelijken</h1>
        <p className="text-muted-foreground">
          Configureer wie verantwoordelijk is voor welke taken
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Hoe werkt het?</strong> Wanneer een nieuwe starter wordt aangemaakt,
          worden automatisch taken toegewezen aan de verantwoordelijken die je hier
          configureert. Je kunt per entiteit specifieke verantwoordelijken instellen,
          of een globale default voor alle entiteiten.
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
          <CardTitle>Nieuwe Verantwoordelijke Toewijzen</CardTitle>
          <CardDescription>
            Voeg een nieuwe taak verantwoordelijke toe voor een specifieke entiteit of globaal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Entiteit</Label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">🌍 Globaal (alle entiteiten)</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Taak Type</Label>
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
              <Label>Verantwoordelijke</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer gebruiker..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notificatie Kanaal</Label>
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
            {saving ? 'Bezig...' : 'Opslaan'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <div className="space-y-6">
        {/* Global Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>🌍 Globale Verantwoordelijken</CardTitle>
            <CardDescription>
              Deze verantwoordelijken gelden voor alle entiteiten (tenzij overschreven)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Laden...</p>
            ) : groupedAssignments.global.length === 0 ? (
              <p className="text-muted-foreground">Geen globale verantwoordelijken ingesteld</p>
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
                  Entiteit-specifieke verantwoordelijken (overschrijven globale instellingen)
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

