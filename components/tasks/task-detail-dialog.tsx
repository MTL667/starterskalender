'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ExternalLink, Calendar as CalendarIcon } from 'lucide-react'
import type { Task } from '@/lib/types'
import { TaskStatusIcon } from './task-status-icon'
import { getPriorityColor, priorityKeys, statusKeys, taskTypeKeys } from './task-helpers'
import { TaskDependencies } from './task-dependencies'
import { TaskUploads } from './task-uploads'
import { TaskReassignHistory } from './task-reassign-history'
import { UserCombobox } from '@/components/ui/user-combobox'

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
  currentUserId?: string
  users: Array<{ id: string; name: string | null; email: string }>
  reassigning: boolean
  onComplete: (taskId: string) => void
  onReassign: (taskId: string, newAssigneeId: string) => void
  onTaskChanged?: () => void
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  isAdmin,
  currentUserId,
  users,
  reassigning,
  onComplete,
  onReassign,
  onTaskChanged,
}: TaskDetailDialogProps) {
  const t = useTranslations('tasks')
  const tc = useTranslations('common')
  const router = useRouter()

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TaskStatusIcon status={task.status} />
            {task.title}
          </DialogTitle>
          <DialogDescription>
            {t(taskTypeKeys[task.type] || 'custom')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge className={getPriorityColor(task.priority)}>
              {t(priorityKeys[task.priority] || 'priorityNormal')}
            </Badge>
            <Badge variant="outline">
              {t(statusKeys[task.status] || 'queued')}
            </Badge>
          </div>

          {task.description && (
            <div>
              <Label>{tc('description')}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {task.description}
              </p>
            </div>
          )}

          {task.starter && (
            <div>
              <Label>{t('starter')}</Label>
              <div className="mt-1 p-3 bg-muted rounded-md">
                <p className="font-medium">{task.starter.firstName} {task.starter.lastName}</p>
                <p className="text-sm text-muted-foreground">
                  {t('start')}:{' '}
                  {new Date(task.starter.startDate).toLocaleDateString('nl-BE')}
                </p>
                {task.starter.entity && (
                  <Badge
                    className="mt-2"
                    style={{
                      backgroundColor: task.starter.entity.colorHex,
                      color: 'white',
                    }}
                  >
                    {task.starter.entity.name}
                  </Badge>
                )}
                {task.starter.notes && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('starterNotes')}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.starter.notes}</p>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      router.push(`/kalender?starterId=${task.starter!.id}`)
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                    {t('viewStarter')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>{t('assignedTo')}</Label>
            {isAdmin && task.status !== 'COMPLETED' ? (
              <div className="mt-1">
                <UserCombobox
                  users={users}
                  value={task.assignedTo?.id || ''}
                  onChange={(id) => onReassign(task.id, id)}
                  placeholder={t('selectUser')}
                  emptyLabel={t('unassigned')}
                  disabled={reassigning}
                />
              </div>
            ) : (
              <p className="text-sm mt-1">
                {task.assignedTo
                  ? (task.assignedTo.name || task.assignedTo.email)
                  : <span className="text-muted-foreground">{t('unassigned')}</span>
                }
              </p>
            )}
          </div>

          {task.scheduledFor && (
            <div>
              <Label>{t('scheduledFor')}</Label>
              <p className="text-sm mt-1 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {new Date(task.scheduledFor).toLocaleString('nl-BE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                {task.template?.addToCalendar && (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    {t('addToCalendar')}
                  </Badge>
                )}
              </p>
            </div>
          )}

          {task.dueDate && (
            <div>
              <Label>{t('deadline')}</Label>
              <p className="text-sm mt-1">
                {new Date(task.dueDate).toLocaleDateString('nl-BE')}
              </p>
            </div>
          )}

          <TaskDependencies dependencies={task.dependencies} />

          {(task.uploads && task.uploads.length > 0) ||
          (task.template?.expectedOutputs && task.template.expectedOutputs.length > 0) ||
          task.template?.uploadFolder ? (
            <TaskUploads
              taskId={task.id}
              uploads={task.uploads}
              expectedOutputs={task.template?.expectedOutputs}
              canUpload={
                task.status !== 'COMPLETED' &&
                (isAdmin || task.assignedTo?.id === currentUserId)
              }
              onUploaded={onTaskChanged}
            />
          ) : null}

          <TaskReassignHistory history={task.reassignHistory} users={users} />

          {task.completedBy && (
            <div>
              <Label>{t('completedBy')}</Label>
              <p className="text-sm mt-1">
                {task.completedBy.name || task.completedBy.email}
                {task.completedAt && (
                  <span className="text-muted-foreground ml-2">
                    {t('on')}{' '}
                    {new Date(task.completedAt).toLocaleDateString('nl-BE')}
                  </span>
                )}
              </p>
            </div>
          )}

          {task.completionNotes && (
            <div>
              <Label>{t('completionNotes')}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {task.completionNotes}
              </p>
            </div>
          )}

          {task.blockedReason && (
            <div>
              <Label>{t('blockReason')}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {task.blockedReason}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {task.status !== 'COMPLETED' &&
            (isAdmin || task.assignedTo?.id === currentUserId) && (
              <Button
                onClick={() => onComplete(task.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('markCompleted')}
              </Button>
            )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
