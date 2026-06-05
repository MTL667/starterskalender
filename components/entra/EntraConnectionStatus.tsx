'use client'

import { useTranslations } from 'next-intl'

type ConnectionStatus = 'healthy' | 'warning' | 'error' | 'unconfigured'

interface EntraConnectionStatusProps {
  status: ConnectionStatus
  certificateExpiry?: string | null
}

const STATUS_CONFIG: Record<ConnectionStatus, { colorClass: string; labelKey: string }> = {
  healthy: { colorClass: 'bg-[hsl(var(--entra-connection-healthy))]', labelKey: 'healthy' },
  warning: { colorClass: 'bg-[hsl(var(--entra-connection-warning))]', labelKey: 'warning' },
  error: { colorClass: 'bg-[hsl(var(--entra-connection-error))]', labelKey: 'error' },
  unconfigured: { colorClass: 'bg-[hsl(var(--entra-connection-unconfigured))]', labelKey: 'unconfigured' },
}

export function EntraConnectionStatus({ status, certificateExpiry }: EntraConnectionStatusProps) {
  const t = useTranslations('entra')

  const derivedStatus = deriveDisplayStatus(status, certificateExpiry)
  const config = STATUS_CONFIG[derivedStatus] || STATUS_CONFIG.unconfigured

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2 w-2 rounded-full ${config.colorClass}`}
        aria-hidden="true"
      />
      <span className="text-sm font-medium">
        {t(`status.${config.labelKey}`)}
      </span>
      {derivedStatus === 'warning' && certificateExpiry && (
        <span className="text-xs text-muted-foreground">
          ({new Date(certificateExpiry).toLocaleDateString()})
        </span>
      )}
    </div>
  )
}

function deriveDisplayStatus(status: ConnectionStatus, certificateExpiry?: string | null): ConnectionStatus {
  if (status === 'healthy' && certificateExpiry) {
    const daysUntilExpiry = (new Date(certificateExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntilExpiry <= 30) return 'warning'
  }
  return status
}
