'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/types'
import { TaskStatusIcon } from './task-status-icon'
import { getPriorityColor, priorityKeys } from './task-helpers'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const t = useTranslations('tasks')

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
            <TaskStatusIcon status={task.status} />
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
          </div>
          {task.starter && (
            <p className="text-xs text-muted-foreground mt-1">
              {task.starter.name}
            </p>
          )}
          {task.dueDate && task.status !== 'COMPLETED' && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('deadline')}: {new Date(task.dueDate).toLocaleDateString('nl-BE')}
            </p>
          )}
          {task.completedAt && task.status === 'COMPLETED' && (
            <p className="text-xs text-muted-foreground mt-1">
              ✅ {new Date(task.completedAt).toLocaleDateString('nl-BE')}
            </p>
          )}
        </div>
        <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
          {t(priorityKeys[task.priority] || 'priorityNormal')}
        </Badge>
      </div>
    </div>
  )
}
