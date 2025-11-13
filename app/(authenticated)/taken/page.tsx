'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  Plus,
  Filter,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  type: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  completedAt?: string
  assignedAt?: string
  starter?: {
    id: string
    name: string
    startDate: string
    entity?: {
      id: string
      name: string
      colorHex: string
    }
  }
  entity?: {
    id: string
    name: string
    colorHex: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  completedBy?: {
    id: string
    name: string
    email: string
  }
  blockedReason?: string
  completionNotes?: string
}

const taskTypeLabels: Record<string, string> = {
  IT_SETUP: 'IT Setup',
  HR_ADMIN: 'HR Administratie',
  FACILITIES: 'Facilities',
  MANAGER_ACTION: 'Manager Actie',
  CUSTOM: 'Custom',
}

const priorityLabels: Record<string, string> = {
  LOW: 'Laag',
  MEDIUM: 'Normaal',
  HIGH: 'Hoog',
  URGENT: 'Urgent',
}

const statusLabels: Record<string, string> = {
  PENDING: 'In wachtrij',
  IN_PROGRESS: 'Bezig',
  BLOCKED: 'Geblokkeerd',
  COMPLETED: 'Voltooid',
  CANCELLED: 'Geannuleerd',
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'LOW':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4 text-blue-500" />
    case 'BLOCKED':
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    case 'CANCELLED':
      return <Ban className="h-4 w-4 text-gray-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

export default function TakenPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [statusFilter, typeFilter, assignedToMe])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (assignedToMe) params.append('assignedToMe', 'true')

      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionNotes: '' }),
      })

      if (res.ok) {
        fetchTasks()
        setDialogOpen(false)
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        task.title.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        task.starter?.name.toLowerCase().includes(search)
      )
    }
    return true
  })

  const groupedTasks = {
    urgent: filteredTasks.filter(
      (t) => t.priority === 'URGENT' && t.status !== 'COMPLETED'
    ),
    pending: filteredTasks.filter((t) => t.status === 'PENDING'),
    inProgress: filteredTasks.filter((t) => t.status === 'IN_PROGRESS'),
    blocked: filteredTasks.filter((t) => t.status === 'BLOCKED'),
    completed: filteredTasks.filter((t) => t.status === 'COMPLETED'),
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Taken</h1>
          <p className="text-muted-foreground">
            Beheer taken voor nieuwe starters
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Zoeken</Label>
              <Input
                placeholder="Zoek taken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="PENDING">In wachtrij</SelectItem>
                  <SelectItem value="IN_PROGRESS">Bezig</SelectItem>
                  <SelectItem value="BLOCKED">Geblokkeerd</SelectItem>
                  <SelectItem value="COMPLETED">Voltooid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  <SelectItem value="IT_SETUP">IT Setup</SelectItem>
                  <SelectItem value="HR_ADMIN">HR Administratie</SelectItem>
                  <SelectItem value="FACILITIES">Facilities</SelectItem>
                  <SelectItem value="MANAGER_ACTION">Manager Actie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={assignedToMe ? 'default' : 'outline'}
                onClick={() => setAssignedToMe(!assignedToMe)}
                className="w-full"
              >
                {assignedToMe ? 'Mijn taken' : 'Alle taken'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Groups */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Taken laden...</p>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Geen taken gevonden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Urgent tasks */}
          {groupedTasks.urgent.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">
                  🚨 Urgente Taken ({groupedTasks.urgent.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.urgent.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setSelectedTask(task)
                      setDialogOpen(true)
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Other tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  📋 In Wachtrij ({groupedTasks.pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.pending.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setSelectedTask(task)
                      setDialogOpen(true)
                    }}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  🔄 Bezig ({groupedTasks.inProgress.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.inProgress.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setSelectedTask(task)
                      setDialogOpen(true)
                    }}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  ✅ Voltooid ({groupedTasks.completed.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.completed.slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setSelectedTask(task)
                      setDialogOpen(true)
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {groupedTasks.blocked.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader>
                <CardTitle className="text-orange-600 dark:text-orange-400">
                  ⚠️ Geblokkeerd ({groupedTasks.blocked.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.blocked.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setSelectedTask(task)
                      setDialogOpen(true)
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedTask.status)}
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription>
                  {taskTypeLabels[selectedTask.type]}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(selectedTask.priority)}>
                    {priorityLabels[selectedTask.priority]}
                  </Badge>
                  <Badge variant="outline">
                    {statusLabels[selectedTask.status]}
                  </Badge>
                </div>

                {selectedTask.description && (
                  <div>
                    <Label>Beschrijving</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {selectedTask.starter && (
                  <div>
                    <Label>Starter</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="font-medium">{selectedTask.starter.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Start:{' '}
                        {new Date(
                          selectedTask.starter.startDate
                        ).toLocaleDateString('nl-BE')}
                      </p>
                      {selectedTask.starter.entity && (
                        <Badge
                          className="mt-2"
                          style={{
                            backgroundColor: selectedTask.starter.entity.colorHex,
                            color: 'white',
                          }}
                        >
                          {selectedTask.starter.entity.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {selectedTask.assignedTo && (
                  <div>
                    <Label>Toegewezen aan</Label>
                    <p className="text-sm mt-1">
                      {selectedTask.assignedTo.name || selectedTask.assignedTo.email}
                    </p>
                  </div>
                )}

                {selectedTask.dueDate && (
                  <div>
                    <Label>Deadline</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedTask.dueDate).toLocaleDateString('nl-BE')}
                    </p>
                  </div>
                )}

                {selectedTask.completedBy && (
                  <div>
                    <Label>Voltooid door</Label>
                    <p className="text-sm mt-1">
                      {selectedTask.completedBy.name || selectedTask.completedBy.email}
                      {selectedTask.completedAt && (
                        <span className="text-muted-foreground ml-2">
                          op{' '}
                          {new Date(selectedTask.completedAt).toLocaleDateString(
                            'nl-BE'
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {selectedTask.completionNotes && (
                  <div>
                    <Label>Notities bij voltooiing</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTask.completionNotes}
                    </p>
                  </div>
                )}

                {selectedTask.blockedReason && (
                  <div>
                    <Label>Reden blokkering</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTask.blockedReason}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                {selectedTask.status !== 'COMPLETED' &&
                  selectedTask.assignedTo?.id === (session?.user as any)?.id && (
                    <Button
                      onClick={() => handleCompleteTask(selectedTask.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Markeer als Voltooid
                    </Button>
                  )}
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Sluiten
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        task.priority === 'URGENT' && 'border-red-300 bg-red-50 dark:bg-red-950/20',
        task.status === 'COMPLETED' && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {getStatusIcon(task.status)}
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
          </div>
          {task.starter && (
            <p className="text-xs text-muted-foreground mt-1">
              {task.starter.name}
            </p>
          )}
          {task.dueDate && task.status !== 'COMPLETED' && (
            <p className="text-xs text-muted-foreground mt-1">
              Deadline: {new Date(task.dueDate).toLocaleDateString('nl-BE')}
            </p>
          )}
        </div>
        <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
          {priorityLabels[task.priority]}
        </Badge>
      </div>
    </div>
  )
}

