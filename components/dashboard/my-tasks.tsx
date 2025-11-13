'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckSquare, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  priority: string
  dueDate?: string
  starter?: {
    name: string
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
}

export function MyTasks() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchMyTasks()
    }
  }, [session])

  const fetchMyTasks = async () => {
    try {
      const res = await fetch('/api/tasks?assignedToMe=true&status=PENDING&status=IN_PROGRESS')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.slice(0, 5)) // Top 5 taken
      }
    } catch (error) {
      console.error('Error fetching my tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const urgentCount = tasks.filter(t => t.priority === 'URGENT').length
  const highCount = tasks.filter(t => t.priority === 'HIGH').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Mijn Openstaande Taken
        </CardTitle>
        <CardDescription>
          Taken die aan jou zijn toegewezen
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-6">Laden...</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
            <p className="text-muted-foreground">Geen openstaande taken! 🎉</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {urgentCount > 0 && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {urgentCount} Urgent
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {highCount} Hoog
                </Badge>
              )}
              <Badge variant="outline">
                {tasks.length} Totaal
              </Badge>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <Link 
                  key={task.id} 
                  href="/taken"
                  className="block"
                >
                  <div className={cn(
                    "p-3 rounded-lg border transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer",
                    task.priority === 'URGENT' && 'border-red-300 bg-red-50 dark:bg-red-950/20'
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {task.priority === 'URGENT' ? (
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                          <h4 className="font-medium text-sm truncate">{task.title}</h4>
                        </div>
                        {task.starter && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {task.starter.name}
                          </p>
                        )}
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            Deadline: {new Date(task.dueDate).toLocaleDateString('nl-BE')}
                          </p>
                        )}
                      </div>
                      <Badge className={cn('text-xs flex-shrink-0', getPriorityColor(task.priority))}>
                        {task.priority === 'URGENT' ? '🚨' : task.priority === 'HIGH' ? '⚠️' : '📋'}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/taken" className="block mt-4">
              <Button variant="outline" className="w-full">
                Alle taken bekijken
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}

