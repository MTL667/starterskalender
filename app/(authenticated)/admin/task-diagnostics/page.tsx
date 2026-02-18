'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface DiagnosticResult {
  taskTemplates: {
    count: number
    templates: any[]
  }
  taskAssignments: {
    count: number
    assignments: any[]
  }
  tasks: {
    count: number
    recentTasks: any[]
  }
  users: {
    count: number
  }
  issues: string[]
  recommendations: string[]
}

export default function TaskDiagnosticsPage() {
  const t = useTranslations('adminTaskDiagnostics')
  const tc = useTranslations('common')
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDiagnostics()
  }, [])

  const fetchDiagnostics = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/task-diagnostics')
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      }
      const data = await res.json()
      setDiagnostics(data)
    } catch (err) {
      console.error('Error fetching diagnostics:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">{t('loadingDiagnostics')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{tc('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchDiagnostics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          {tc('retry')}
        </Button>
      </div>
    )
  }

  if (!diagnostics) {
    return null
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🔍 {t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={fetchDiagnostics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {tc('refresh')}
        </Button>
      </div>

      {/* Issues */}
      {diagnostics.issues.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t('problemsFound')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {diagnostics.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      {diagnostics.recommendations.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('recommendations')}</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              {diagnostics.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm">{rec}</li>
              ))}
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {diagnostics.issues.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{t('systemOk')}</AlertTitle>
          <AlertDescription>
            {t('allComponentsOk')}
          </AlertDescription>
        </Alert>
      )}

      {/* Task Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {diagnostics.taskTemplates.count > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {t('templates')}
          </CardTitle>
          <CardDescription>
            {diagnostics.taskTemplates.count} {t('activeTemplates')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {diagnostics.taskTemplates.templates.length > 0 ? (
            <div className="space-y-3">
              {diagnostics.taskTemplates.templates.map((template: any) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">{template.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {tc('type')}: {template.type} | {t('priorityLabel')}: {template.priority} | 
                      {t('deadlineDays', { days: template.daysUntilDue })}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    template.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? tc('active') : tc('inactive')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                {t('noTaskTemplates')} Run: <code className="bg-black/10 px-1 py-0.5 rounded">npm run db:seed-tasks</code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Task Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {diagnostics.taskAssignments.count > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {t('assignments')}
          </CardTitle>
          <CardDescription>
            {diagnostics.taskAssignments.count} {t('responsiblesConfigured')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {diagnostics.taskAssignments.assignments.length > 0 ? (
            <div className="space-y-3">
              {diagnostics.taskAssignments.assignments.map((assignment: any) => (
                <div
                  key={assignment.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {assignment.taskType}
                      {assignment.entity && ` - ${assignment.entity.name}`}
                      {!assignment.entity && ` - ${t('globalLabel')}`}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t('responsibleLabel')} {assignment.assignedTo?.name || assignment.assignedTo?.email || tc('unknown')}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {assignment.notifyChannel}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                {t('noTaskAssignments')} {t('noTaskAssignmentsHint')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentTasks')}</CardTitle>
          <CardDescription>
            {t('totalRecent', { total: diagnostics.tasks.count, count: diagnostics.tasks.recentTasks.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {diagnostics.tasks.recentTasks.length > 0 ? (
            <div className="space-y-3">
              {diagnostics.tasks.recentTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {task.starter && `${t('for')} ${task.starter.name} | `}
                      {tc('type')}: {task.type} | 
                      {tc('status')}: {task.status} |
                      {t('createdAt')} {new Date(task.createdAt).toLocaleDateString('nl-BE')}
                    </div>
                    {task.assignedTo && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('assignedToLabel')} {task.assignedTo.name || task.assignedTo.email}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ml-2 ${
                    task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                {t('noTasksYet')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>{t('systemStats')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{diagnostics.taskTemplates.count}</div>
              <div className="text-sm text-muted-foreground">{t('templates')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{diagnostics.taskAssignments.count}</div>
              <div className="text-sm text-muted-foreground">{t('assignments')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{diagnostics.tasks.count}</div>
              <div className="text-sm text-muted-foreground">{t('tasksLabel')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{diagnostics.users.count}</div>
              <div className="text-sm text-muted-foreground">{t('usersLabel')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

