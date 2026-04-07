'use client'

import { CheckCircle2, Clock, AlertCircle, Ban } from 'lucide-react'

export function TaskStatusIcon({ status }: { status: string }) {
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
