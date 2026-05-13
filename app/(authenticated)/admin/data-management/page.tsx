'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Upload, Loader2, Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface TableGroup {
  key: string
  label: string
  tables: string[]
}

const GROUP_LABELS: Record<string, string> = {
  configuration: 'Configuratie (entiteiten, functies, materialen, templates)',
  rbac: 'RBAC (rollen & permissies)',
  users: 'Gebruikers (accounts, roltoekenningen)',
  starters: 'Starters (starters, taken, documenten, materialen)',
  bookings: 'Boekingen (vergaderruimtes)',
  notifications: 'Notificaties',
  logs: 'Logs (audit, e-mail)',
}

export default function DataManagementPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<TableGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    ok: boolean
    stats?: { inserts: number; errors: number; errorDetails: string[] }
    error?: string
  } | null>(null)

  const hasPermission = session?.user?.perms?.includes('admin:data:manage')

  useEffect(() => {
    fetch('/api/admin/data-management/export')
      .then(r => r.json())
      .then(data => {
        setGroups(data.groups || [])
        setSelectedGroups(new Set((data.groups || []).map((g: TableGroup) => g.key)))
      })
      .catch(() => {})
  }, [])

  const toggleGroup = (key: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => setSelectedGroups(new Set(groups.map(g => g.key)))
  const selectNone = () => setSelectedGroups(new Set())

  const handleExport = async () => {
    if (selectedGroups.size === 0) return
    setExporting(true)
    try {
      const res = await fetch('/api/admin/data-management/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: Array.from(selectedGroups) }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Export mislukt')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'export.sql'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Export mislukt')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.name.endsWith('.sql')) {
      alert('Alleen .sql bestanden toegestaan')
      return
    }

    if (!confirm(`Weet je zeker dat je "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB) wilt importeren?\n\nBestaande records worden bijgewerkt, nieuwe worden toegevoegd.`)) {
      return
    }

    setImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/data-management/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.ok) {
        setImportResult(data)
      } else {
        setImportResult({ ok: false, error: data.error || 'Import mislukt' })
      }
    } catch {
      setImportResult({ ok: false, error: 'Import mislukt' })
    } finally {
      setImporting(false)
    }
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Je hebt geen toegang tot databeheer.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Databeheer</h1>
        </div>
        <p className="text-muted-foreground">
          Exporteer en importeer databasegegevens. Export gebruikt pg_dump (SQL), import voegt toe of werkt bij (upsert).
        </p>
      </div>

      <div className="grid gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export
            </CardTitle>
            <CardDescription>
              Selecteer welke gegevens je wilt exporteren als SQL-bestand.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Alles selecteren</Button>
              <Button variant="outline" size="sm" onClick={selectNone}>Niets selecteren</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groups.map(g => (
                <div key={g.key} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <Checkbox
                    id={`group-${g.key}`}
                    checked={selectedGroups.has(g.key)}
                    onCheckedChange={() => toggleGroup(g.key)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`group-${g.key}`} className="font-medium cursor-pointer">
                      {GROUP_LABELS[g.key] || g.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.tables.length} tabel{g.tables.length !== 1 ? 'len' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting || selectedGroups.size === 0}
              className="w-full"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting ? 'Exporteren...' : `Exporteer ${selectedGroups.size} groep${selectedGroups.size !== 1 ? 'en' : ''}`}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import
            </CardTitle>
            <CardDescription>
              Upload een eerder geëxporteerd SQL-bestand. Bestaande records worden bijgewerkt, nieuwe toegevoegd.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Importeer alleen bestanden van een vertrouwde bron. De SQL wordt rechtstreeks uitgevoerd op de database.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                disabled={importing}
                onClick={() => document.getElementById('import-file')?.click()}
                className="w-full"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {importing ? 'Importeren...' : 'Kies SQL-bestand'}
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".sql"
                className="hidden"
                onChange={handleImport}
                disabled={importing}
              />
            </div>

            {importResult && (
              <Alert variant={importResult.ok ? 'default' : 'destructive'}>
                {importResult.ok ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {importResult.ok ? (
                    <div>
                      <p className="font-medium">Import voltooid</p>
                      <p className="text-sm mt-1">
                        {importResult.stats?.inserts || 0} inserts uitgevoerd,{' '}
                        {importResult.stats?.errors || 0} fouten.
                      </p>
                      {(importResult.stats?.errors ?? 0) > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer">Foutdetails</summary>
                          <pre className="text-xs mt-1 whitespace-pre-wrap max-h-40 overflow-auto">
                            {importResult.stats?.errorDetails?.join('\n')}
                          </pre>
                        </details>
                      )}
                    </div>
                  ) : (
                    <p>{importResult.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
