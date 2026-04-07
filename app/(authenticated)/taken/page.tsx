'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Filter } from 'lucide-react'
import type { Task } from '@/lib/types'
import { TaskCard } from '@/components/tasks/task-card'
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog'

export default function TakenPage() {
  const t = useTranslations('tasks')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])
  const [reassigning, setReassigning] = useState(false)

  const isAdmin = session?.user?.role === 'HR_ADMIN'
  const currentUserId = session?.user?.id

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [assignedToMe, setAssignedToMe] = useState(true)
  const [assignedToMeInitialized, setAssignedToMeInitialized] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
        setDialogOpen(true)
        router.replace('/taken', { scroll: false })
      } else {
        fetchSpecificTask(taskId)
      }
    }
  }, [searchParams, tasks])

  const fetchSpecificTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`)
      if (res.ok) {
        const task = await res.json()
        setSelectedTask(task)
        setDialogOpen(true)
        router.replace('/taken', { scroll: false })
      }
    } catch (error) {
      console.error('Error fetching specific task:', error)
    }
  }

  useEffect(() => {
    if (session?.user && !assignedToMeInitialized) {
      setAssignedToMe(!isAdmin)
      setAssignedToMeInitialized(true)
    }
  }, [session, isAdmin, assignedToMeInitialized])

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(err => console.error('Error fetching users:', err))
    }
  }, [isAdmin])

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

  const handleReassign = async (taskId: string, newAssigneeId: string) => {
    setReassigning(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: newAssigneeId || null }),
      })

      if (res.ok) {
        const updatedTask = await res.json()
        setSelectedTask(updatedTask)
        fetchTasks()
      }
    } catch (error) {
      console.error('Error reassigning task:', error)
    } finally {
      setReassigning(false)
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
    completed: filteredTasks
      .filter((t) => t.status === 'COMPLETED')
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return dateB - dateA
      }),
  }

  const openTask = (task: Task) => {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>{tc('search')}</Label>
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('allStatuses')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="PENDING">{t('queued')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('inProgress')}</SelectItem>
                  <SelectItem value="BLOCKED">{t('blocked')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('allTypes')}</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="IT_SETUP">{t('itSetup')}</SelectItem>
                  <SelectItem value="HR_ADMIN">{t('hrAdmin')}</SelectItem>
                  <SelectItem value="FACILITIES">{t('facilities')}</SelectItem>
                  <SelectItem value="MANAGER_ACTION">{t('managerAction')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={assignedToMe ? 'default' : 'outline'}
                onClick={() => setAssignedToMe(!assignedToMe)}
                className="w-full"
              >
                {assignedToMe ? t('myTasks') : t('allTasks')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">{t('loadingTasks')}</p>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">{t('noTasksFound')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedTasks.urgent.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">
                  🚨 {t('urgentTasks')} ({groupedTasks.urgent.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.urgent.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => openTask(task)} />
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  📋 {t('queuedCount')} ({groupedTasks.pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.pending.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => openTask(task)} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  🔄 {t('inProgressCount')} ({groupedTasks.inProgress.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.inProgress.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => openTask(task)} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  ✅ {t('completedCount')} ({groupedTasks.completed.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.completed.slice(0, 5).map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => openTask(task)} />
                ))}
              </CardContent>
            </Card>
          </div>

          {groupedTasks.blocked.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader>
                <CardTitle className="text-orange-600 dark:text-orange-400">
                  ⚠️ {t('blockedCount')} ({groupedTasks.blocked.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks.blocked.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => openTask(task)} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <TaskDetailDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        users={users}
        reassigning={reassigning}
        onComplete={handleCompleteTask}
        onReassign={handleReassign}
      />
    </div>
  )
}
