'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Package, ShoppingCart, Truck, Check, Undo2 } from 'lucide-react'

type MaterialStatus = 'PENDING' | 'IN_STOCK' | 'ORDERED' | 'RECEIVED' | 'RESERVED'

interface MaterialActionButtonsProps {
  status: MaterialStatus
  materialId: string
  onStatusChange: (status: string, expectedDeliveryDate?: string) => void
}

export function MaterialActionButtons({ status, onStatusChange }: MaterialActionButtonsProps) {
  const [orderDate, setOrderDate] = useState('')
  const [orderPopoverOpen, setOrderPopoverOpen] = useState(false)

  const handleOrder = () => {
    onStatusChange('ORDERED', orderDate ? new Date(orderDate).toISOString() : undefined)
    setOrderPopoverOpen(false)
    setOrderDate('')
  }

  switch (status) {
    case 'PENDING':
      return (
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onStatusChange('IN_STOCK')}
          >
            <Package className="h-3 w-3 mr-1" />
            Op voorraad
          </Button>
          <Popover open={orderPopoverOpen} onOpenChange={setOrderPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Bestellen
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <label className="text-xs font-medium">Verwachte leverdatum</label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={handleOrder}
                >
                  Bevestigen
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )

    case 'IN_STOCK':
      return (
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onStatusChange('RESERVED')}
          >
            <Check className="h-3 w-3 mr-1" />
            Reserveren
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Ongedaan maken → Actie nodig"
            onClick={() => onStatusChange('PENDING')}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )

    case 'ORDERED':
      return (
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onStatusChange('RECEIVED')}
          >
            <Truck className="h-3 w-3 mr-1" />
            Ontvangen
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Ongedaan maken → Actie nodig"
            onClick={() => onStatusChange('PENDING')}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )

    case 'RECEIVED':
      return (
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onStatusChange('RESERVED')}
          >
            <Check className="h-3 w-3 mr-1" />
            Reserveren
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Ongedaan maken → Besteld"
            onClick={() => onStatusChange('ORDERED')}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )

    case 'RESERVED':
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="h-3 w-3" /> Gereserveerd
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Ongedaan maken → Actie nodig"
            onClick={() => onStatusChange('PENDING')}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )

    default:
      return null
  }
}
