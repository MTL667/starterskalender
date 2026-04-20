'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'

type Template = {
  id: string
  type: string
  title: string
  forJobRoleTitles: string[]
  requireExplicitJobRole: boolean
  isActive: boolean
}

type JobRole = {
  id: string
  title: string
  entity: { id: string; name: string }
}

export default function TaskTemplateMatrixPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const load = async (all: boolean) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/task-template-matrix${all ? '?all=1' : ''}`)
      const data = await res.json()
      setTemplates(data.templates || [])
      setJobRoles(data.jobRoles || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(showAll)
  }, [showAll])

  // Groepeer unieke titels (meerdere entiteiten kunnen dezelfde functietitel hebben)
  const uniqueTitles = Array.from(new Set(jobRoles.map(r => r.title))).sort()

  const isEnabled = (tpl: Template, title: string) => tpl.forJobRoleTitles.includes(title)

  const toggle = async (tpl: Template, title: string) => {
    const key = `${tpl.id}:${title}`
    setSaving(key)
    const enabled = !isEnabled(tpl, title)

    // optimistic update
    setTemplates(prev => prev.map(t => t.id === tpl.id
      ? {
        ...t,
        forJobRoleTitles: enabled
          ? [...t.forJobRoleTitles, title]
          : t.forJobRoleTitles.filter(x => x !== title),
      }
      : t
    ))

    try {
      const res = await fetch('/api/admin/task-template-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: tpl.id, jobRoleTitle: title, enabled }),
      })
      if (!res.ok) throw new Error('Opslaan mislukt')
    } catch {
      // revert
      setTemplates(prev => prev.map(t => t.id === tpl.id
        ? {
          ...t,
          forJobRoleTitles: !enabled
            ? [...t.forJobRoleTitles, title]
            : t.forJobRoleTitles.filter(x => x !== title),
        }
        : t
      ))
      alert('Opslaan mislukt')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Template × Functie matrix</h1>
            <p className="text-muted-foreground">
              Vink per functie aan welke automatische taken aangemaakt moeten worden.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showAll} onCheckedChange={setShowAll} />
          Toon ook generieke templates
        </label>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Templates met <Badge variant="outline" className="mx-1">expliciet per functie</Badge>
          worden <strong>standaard niet</strong> aangemaakt. Vink hieronder aan voor welke functies
          ze wel moeten lopen. Generieke templates (zonder die vlag) volgen het klassieke patroon:
          lege lijst = alle functies.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Matrix</CardTitle>
          <CardDescription>
            {templates.length} templates × {uniqueTitles.length} functies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Laden…</p>
          ) : templates.length === 0 || uniqueTitles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Geen data. {!showAll && 'Schakel "generieke templates" in of markeer templates als "expliciet per functie".'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b bg-muted/50 sticky left-0 z-10 min-w-[280px]">
                      Template
                    </th>
                    {uniqueTitles.map(title => (
                      <th
                        key={title}
                        className="text-center p-2 border-b bg-muted/50 min-w-[110px] align-bottom"
                      >
                        <div className="text-xs leading-tight whitespace-normal">{title}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl, idx) => (
                    <tr key={tpl.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-2 border-b sticky left-0 z-10 bg-inherit">
                        <div className="flex flex-col">
                          <span className="font-medium truncate">{tpl.title}</span>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="font-mono text-[9px]">{tpl.type}</Badge>
                            {tpl.requireExplicitJobRole && (
                              <Badge variant="secondary" className="text-[9px]">expliciet</Badge>
                            )}
                            {!tpl.isActive && <Badge variant="destructive" className="text-[9px]">inactief</Badge>}
                          </div>
                        </div>
                      </td>
                      {uniqueTitles.map(title => {
                        const on = isEnabled(tpl, title)
                        const key = `${tpl.id}:${title}`
                        return (
                          <td key={title} className="p-2 border-b text-center">
                            <button
                              onClick={() => toggle(tpl, title)}
                              disabled={saving === key}
                              className={`w-7 h-7 rounded border flex items-center justify-center transition-colors mx-auto ${
                                on
                                  ? 'bg-green-500 border-green-600 text-white'
                                  : 'bg-background hover:bg-muted border-muted-foreground/30'
                              } ${saving === key ? 'opacity-50' : ''}`}
                              aria-label={`Toggle ${tpl.title} voor ${title}`}
                              title={on ? 'Aan — klik om uit te zetten' : 'Uit — klik om aan te zetten'}
                            >
                              {on ? '✓' : ''}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
