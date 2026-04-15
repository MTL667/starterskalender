'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MaterialStatusStepper, getStatusLabel, getStatusColor } from '@/components/materials/material-status-stepper'
import { Package, ShoppingCart, Truck, Check, Clock, AlertTriangle, Filter, Loader2, Trash2 } from 'lucide-react'

type MaterialStatus = 'PENDING' | 'IN_STOCK' | 'ORDERED' | 'RECEIVED' | 'RESERVED'

interface StarterMaterialItem {
  id: string
  materialId: string
  starterId: string
  status: MaterialStatus
  expectedDeliveryDate: string | null
  orderedAt: string | null
  receivedAt: string | null
  reservedAt: string | null
  notes: string | null
  material: { id: string; name: string; category: string | null }
  starter: {
    id: string
    firstName: string
    lastName: string
    startDate: string | null
    entityId: string | null
    entity: { id: string; name: string; colorHex: string } | null
  }
}

interface DashboardData {
  materials: StarterMaterialItem[]
  statusCounts: Record<string, number>
  overdueCount: number
}

export default function MaterialenDashboard() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [materialFilter, setMaterialFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>('')
  const [bulkDate, setBulkDate] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])
  const [materialTypes, setMaterialTypes] = useState<{ id: string; name: string }[]>([])

  const userPermissions: string[] = (session?.user as any)?.permissions ?? []
  const isAdmin = (session?.user as any)?.role === 'HR_ADMIN'
  const isMaterialMgr = isAdmin || userPermissions.includes('MATERIAL_MANAGER')

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!isMaterialMgr) {
      router.push('/dashboard')
    }
  }, [sessionStatus, isMaterialMgr, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (materialFilter !== 'all') params.set('materialId', materialFilter)
      if (entityFilter !== 'all') params.set('entityId', entityFilter)
      if (overdueOnly) params.set('overdue', '1')

      const res = await fetch(`/api/materials/dashboard?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, materialFilter, entityFilter, overdueOnly])

  useEffect(() => {
    if (isMaterialMgr) fetchData()
  }, [fetchData, isMaterialMgr])

  useEffect(() => {
    fetch('/api/entities').then(r => r.ok ? r.json() : []).then(setEntities).catch(() => {})
    fetch('/api/materials?activeOnly=true').then(r => r.ok ? r.json() : []).then(setMaterialTypes).catch(() => {})
  }, [])

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0 || !bulkStatus) return
    setBulkLoading(true)
    try {
      const body: any = { ids: Array.from(selectedIds), status: bulkStatus }
      if (bulkStatus === 'ORDERED' && bulkDate) {
        body.expectedDeliveryDate = new Date(bulkDate).toISOString()
      }
      const res = await fetch('/api/materials/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        setBulkStatus('')
        setBulkDate('')
        fetchData()
      }
    } catch (error) {
      console.error('Error bulk updating:', error)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleSingleDelete = async (item: StarterMaterialItem) => {
    try {
      const res = await fetch(`/api/starters/${item.starterId}/materials/${item.materialId}`, {
        method: 'DELETE',
      })
      if (res.ok) fetchData()
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/materials/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchData()
      }
    } catch (error) {
      console.error('Error bulk deleting:', error)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleSingleUpdate = async (item: StarterMaterialItem, newStatus: string, deliveryDate?: string) => {
    try {
      const res = await fetch(`/api/starters/${item.starterId}/materials/${item.materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, expectedDeliveryDate: deliveryDate }),
      })
      if (res.ok) fetchData()
    } catch (error) {
      console.error('Error updating material:', error)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data) return
    if (selectedIds.size === data.materials.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.materials.map(m => m.id)))
    }
  }

  if (sessionStatus === 'loading' || !isMaterialMgr) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const counts = data?.statusCounts ?? {}

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Materialen Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer alle materialen over alle starters heen
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(['PENDING', 'IN_STOCK', 'ORDERED', 'RECEIVED', 'RESERVED'] as MaterialStatus[]).map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setOverdueOnly(false) }}
            className={`p-3 rounded-lg border text-left transition-colors ${
              statusFilter === s && !overdueOnly
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="text-2xl font-bold">{counts[s] ?? 0}</div>
            <div className="text-xs text-muted-foreground">{getStatusLabel(s)}</div>
          </button>
        ))}
      </div>

      {/* Overdue alert */}
      {(data?.overdueCount ?? 0) > 0 && (
        <button
          onClick={() => { setOverdueOnly(true); setStatusFilter('all') }}
          className={`w-full mb-4 p-3 rounded-lg border flex items-center gap-3 text-left transition-colors ${
            overdueOnly
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
              : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 hover:border-red-400'
          }`}
        >
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <span className="font-semibold text-red-700 dark:text-red-400">
              {data?.overdueCount} items met verlopen leverdatum
            </span>
            <span className="text-xs text-red-600 dark:text-red-400 ml-2">
              Klik om te filteren
            </span>
          </div>
        </button>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Materiaal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle materialen</SelectItem>
            {materialTypes.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Entiteit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle entiteiten</SelectItem>
            {entities.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => {
            setStatusFilter('PENDING')
            setMaterialFilter('all')
            setEntityFilter('all')
            setOverdueOnly(false)
          }}
        >
          Reset filters
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50 border">
          <span className="text-sm font-medium">{selectedIds.size} geselecteerd</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Nieuwe status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Actie nodig</SelectItem>
              <SelectItem value="IN_STOCK">Op voorraad</SelectItem>
              <SelectItem value="ORDERED">Besteld</SelectItem>
              <SelectItem value="RECEIVED">Ontvangen</SelectItem>
              <SelectItem value="RESERVED">Gereserveerd</SelectItem>
            </SelectContent>
          </Select>
          {bulkStatus === 'ORDERED' && (
            <Input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="w-[160px] h-8 text-xs"
              placeholder="Leverdatum"
            />
          )}
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleBulkUpdate}
            disabled={!bulkStatus || bulkLoading}
          >
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Toepassen
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:text-destructive"
            onClick={handleBulkDelete}
            disabled={bulkLoading}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Verwijderen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Deselecteren
          </Button>
        </div>
      )}

      {/* Materials list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.materials.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Geen materialen gevonden voor deze filters</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 w-8">
                  <Checkbox
                    checked={data.materials.length > 0 && selectedIds.size === data.materials.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 text-left font-medium">Materiaal</th>
                <th className="p-3 text-left font-medium">Starter</th>
                <th className="p-3 text-left font-medium">Entiteit</th>
                <th className="p-3 text-left font-medium">Startdatum</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Leverdatum</th>
                <th className="p-3 text-right font-medium">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.materials.map(item => {
                const isOverdue = item.status === 'ORDERED' &&
                  item.expectedDeliveryDate &&
                  new Date(item.expectedDeliveryDate) < new Date()

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-muted/30 ${isOverdue ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{item.material.name}</div>
                      {item.material.category && (
                        <span className="text-xs text-muted-foreground">{item.material.category}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {item.starter.firstName} {item.starter.lastName}
                    </td>
                    <td className="p-3">
                      {item.starter.entity && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: item.starter.entity.colorHex, color: item.starter.entity.colorHex }}
                        >
                          {item.starter.entity.name}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {item.starter.startDate
                        ? new Date(item.starter.startDate).toLocaleDateString('nl-BE', { dateStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="p-3">
                      <MaterialStatusStepper
                        status={item.status}
                        expectedDeliveryDate={item.expectedDeliveryDate}
                        orderedAt={item.orderedAt}
                        receivedAt={item.receivedAt}
                        reservedAt={item.reservedAt}
                        compact
                      />
                    </td>
                    <td className="p-3 text-xs">
                      {item.expectedDeliveryDate ? (
                        <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                          {new Date(item.expectedDeliveryDate).toLocaleDateString('nl-BE', { dateStyle: 'short' })}
                          {isOverdue && ' ⚠️'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <QuickAction item={item} onUpdate={handleSingleUpdate} />
                        {item.status !== 'RESERVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Verwijderen"
                            onClick={() => handleSingleDelete(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function QuickAction({ item, onUpdate }: { item: StarterMaterialItem; onUpdate: (item: StarterMaterialItem, status: string, date?: string) => void }) {
  const [orderDate, setOrderDate] = useState('')
  const [open, setOpen] = useState(false)

  switch (item.status) {
    case 'PENDING':
      return (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate(item, 'IN_STOCK')}>
            <Package className="h-3 w-3 mr-1" /> Voorraad
          </Button>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <ShoppingCart className="h-3 w-3 mr-1" /> Bestellen
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="space-y-2">
                <label className="text-xs font-medium">Verwachte leverdatum</label>
                <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" className="w-full h-7 text-xs" onClick={() => { onUpdate(item, 'ORDERED', orderDate ? new Date(orderDate).toISOString() : undefined); setOpen(false) }}>
                  Bevestigen
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    case 'IN_STOCK':
      return (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate(item, 'RESERVED')}>
          <Check className="h-3 w-3 mr-1" /> Reserveren
        </Button>
      )
    case 'ORDERED':
      return (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate(item, 'RECEIVED')}>
          <Truck className="h-3 w-3 mr-1" /> Ontvangen
        </Button>
      )
    case 'RECEIVED':
      return (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate(item, 'RESERVED')}>
          <Check className="h-3 w-3 mr-1" /> Reserveren
        </Button>
      )
    case 'RESERVED':
      return <span className="text-xs text-green-600">✓</span>
    default:
      return null
  }
}
