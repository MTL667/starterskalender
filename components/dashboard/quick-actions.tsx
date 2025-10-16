'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function QuickActions() {
  return (
    <div className="flex gap-4">
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Nieuwe Starter
      </Button>
    </div>
  )
}

