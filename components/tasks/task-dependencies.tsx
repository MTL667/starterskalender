'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Lock } from 'lucide-react'
import type { TaskDependency } from '@/lib/types'
import { taskTypeKeys } from './task-helpers'

interface TaskDependenciesProps {
  dependencies?: TaskDependency[]
}

export function TaskDependencies({ dependencies }: TaskDependenciesProps) {
  const t = useTranslations('tasks')

  if (!dependencies || dependencies.length === 0) return null

  const total = dependencies.length
  const done = dependencies.filter(d => d.status === 'COMPLETED').length
  const allDone = done === total

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('dependencies')}</span>
        <Badge variant={allDone ? 'default' : 'outline'} className="ml-auto">
          {done}/{total}
        </Badge>
      </div>
      <div className="space-y-1 border rounded-md p-2 bg-muted/40">
        {dependencies.map((dep) => {
          const isDone = dep.status === 'COMPLETED'
          const typeLabel = taskTypeKeys[dep.type] || 'custom'
          return (
            <div key={dep.id} className="flex items-center gap-2 text-sm">
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-orange-500 shrink-0" />
              )}
              <span className={isDone ? 'line-through text-muted-foreground' : ''}>
                {dep.title}
              </span>
              <Badge variant="outline" className="text-[10px] py-0 h-5 ml-auto">
                {t(typeLabel)}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
