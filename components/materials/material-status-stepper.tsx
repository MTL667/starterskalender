'use client'

import { cn } from '@/lib/utils'
import { Package, ShoppingCart, Truck, Check, Clock } from 'lucide-react'

type MaterialStatus = 'PENDING' | 'IN_STOCK' | 'ORDERED' | 'RECEIVED' | 'RESERVED'

interface Step {
  key: MaterialStatus
  label: string
  icon: React.ReactNode
}

const ROUTE_A_STEPS: Step[] = [
  { key: 'IN_STOCK', label: 'Op voorraad', icon: <Package className="h-3 w-3" /> },
  { key: 'RESERVED', label: 'Gereserveerd', icon: <Check className="h-3 w-3" /> },
]

const ROUTE_B_STEPS: Step[] = [
  { key: 'ORDERED', label: 'Besteld', icon: <ShoppingCart className="h-3 w-3" /> },
  { key: 'RECEIVED', label: 'Ontvangen', icon: <Truck className="h-3 w-3" /> },
  { key: 'RESERVED', label: 'Gereserveerd', icon: <Check className="h-3 w-3" /> },
]

const STATUS_ORDER_A: MaterialStatus[] = ['IN_STOCK', 'RESERVED']
const STATUS_ORDER_B: MaterialStatus[] = ['ORDERED', 'RECEIVED', 'RESERVED']

function isRouteB(status: MaterialStatus): boolean {
  return status === 'ORDERED' || status === 'RECEIVED'
}

function getStepIndex(status: MaterialStatus, route: 'A' | 'B'): number {
  const order = route === 'A' ? STATUS_ORDER_A : STATUS_ORDER_B
  return order.indexOf(status)
}

interface MaterialStatusStepperProps {
  status: MaterialStatus
  expectedDeliveryDate?: string | null
  orderedAt?: string | null
  receivedAt?: string | null
  reservedAt?: string | null
  compact?: boolean
}

export function MaterialStatusStepper({
  status,
  expectedDeliveryDate,
  orderedAt,
  receivedAt,
  reservedAt,
  compact = false,
}: MaterialStatusStepperProps) {
  if (status === 'PENDING') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3" />
        <span>Actie nodig</span>
      </div>
    )
  }

  const route = isRouteB(status) ? 'B' : (status === 'IN_STOCK' ? 'A' : (orderedAt ? 'B' : 'A'))
  const steps = route === 'A' ? ROUTE_A_STEPS : ROUTE_B_STEPS
  const currentIndex = getStepIndex(status, route)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('nl-BE', { dateStyle: 'short' })

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5')}>
      {steps.map((step, idx) => {
        const isCompleted = idx <= currentIndex

        let tooltip = step.label
        if (step.key === 'ORDERED' && orderedAt) tooltip += ` (${formatDate(orderedAt)})`
        if (step.key === 'ORDERED' && expectedDeliveryDate) tooltip += ` — verwacht ${formatDate(expectedDeliveryDate)}`
        if (step.key === 'RECEIVED' && receivedAt) tooltip += ` (${formatDate(receivedAt)})`
        if (step.key === 'RESERVED' && reservedAt) tooltip += ` (${formatDate(reservedAt)})`

        return (
          <div key={step.key} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  'h-0.5',
                  compact ? 'w-2' : 'w-3',
                  isCompleted ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}
            <div
              title={tooltip}
              className={cn(
                'flex items-center justify-center rounded-full transition-colors cursor-default',
                compact ? 'h-5 w-5' : 'h-6 w-6',
                isCompleted
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {step.icon}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function getStatusLabel(status: MaterialStatus): string {
  const labels: Record<MaterialStatus, string> = {
    PENDING: 'Actie nodig',
    IN_STOCK: 'Op voorraad',
    ORDERED: 'Besteld',
    RECEIVED: 'Ontvangen',
    RESERVED: 'Gereserveerd',
  }
  return labels[status] || status
}

export function getStatusColor(status: MaterialStatus): string {
  const colors: Record<MaterialStatus, string> = {
    PENDING: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950',
    IN_STOCK: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950',
    ORDERED: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-950',
    RECEIVED: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-950',
    RESERVED: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950',
  }
  return colors[status] || ''
}
