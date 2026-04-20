'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface UserOption {
  id: string
  name?: string | null
  email: string
  status?: string | null
}

interface UserComboboxProps {
  users: UserOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  emptyLabel?: string
  className?: string
  disabled?: boolean
  allowClear?: boolean
}

export function UserCombobox({
  users,
  value,
  onChange,
  placeholder = 'Selecteer gebruiker…',
  emptyLabel = 'Geen gebruikers gevonden',
  className,
  disabled,
  allowClear = true,
}: UserComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => users.find((u) => u.id === value) || null,
    [users, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [users, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      // focus input after popover opens
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const displayLabel = selected
    ? selected.name || selected.email
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {displayLabel}
            {selected?.status && selected.status !== 'ACTIVE' && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({selected.status})
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op naam of e-mail…"
              className="pl-8 h-8"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {allowClear && selected && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted flex items-center gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Selectie wissen
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              {emptyLabel}
            </div>
          ) : (
            filtered.map((user) => {
              const isSelected = user.id === value
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onChange(user.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-muted',
                    isSelected && 'bg-muted'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {user.name || user.email}
                    </div>
                    {user.name && (
                      <div className="truncate text-xs text-muted-foreground">
                        {user.email}
                        {user.status && user.status !== 'ACTIVE' && (
                          <span className="ml-1">({user.status})</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
