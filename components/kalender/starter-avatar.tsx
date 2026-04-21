'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface StarterAvatarProps {
  starterId: string
  firstName: string
  lastName: string
  hasPhoto?: boolean
  entityColor?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
} as const

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

// Kleurcontrast helper — kies zwarte of witte tekst op basis van achtergrond.
function contrastText(hex: string | null | undefined): string {
  if (!hex) return '#fff'
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#fff'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111' : '#fff'
}

export function StarterAvatar({
  starterId,
  firstName,
  lastName,
  hasPhoto = false,
  entityColor,
  className,
  size = 'lg',
}: StarterAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = hasPhoto && !imgFailed
  const initials = getInitials(firstName, lastName)

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center shrink-0 font-semibold select-none',
        SIZES[size],
        className,
      )}
      style={
        showImage
          ? undefined
          : {
              backgroundColor: entityColor || 'var(--muted)',
              color: contrastText(entityColor),
            }
      }
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/starters/${starterId}/photo`}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span>{initials || '·'}</span>
      )}
    </div>
  )
}
