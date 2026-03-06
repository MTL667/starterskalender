'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Check, Minus } from 'lucide-react'
import Link from 'next/link'

interface Material {
  id: string
  name: string
  category: string | null
}

interface JobRoleMaterial {
  materialId: string
  isRequired: boolean
  notes: string | null
}

interface JobRole {
  id: string
  title: string
  entity: { name: string }
  materials: JobRoleMaterial[]
}

export default function MaterialMatrixPage() {
  const t = useTranslations('materialMatrix')
  const [materials, setMaterials] = useState<Material[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/material-matrix')
      .then(res => res.json())
      .then(data => {
        setMaterials(data.materials || [])
        setJobRoles(data.jobRoles || [])
      })
      .catch(err => console.error('Error loading matrix:', err))
      .finally(() => setLoading(false))
  }, [])

  const getMaterialForRole = (roleId: string, materialId: string) => {
    const role = jobRoles.find(r => r.id === roleId)
    return role?.materials.find(m => m.materialId === materialId)
  }

  const exportCSV = () => {
    const headers = ['Materiaal', 'Categorie', ...jobRoles.map(r => `${r.title} (${r.entity.name})`)]
    const rows = materials.map(mat => {
      const cells = jobRoles.map(role => {
        const jrm = getMaterialForRole(role.id, mat.id)
        if (!jrm) return ''
        return jrm.isRequired ? 'Verplicht' : 'Optioneel'
      })
      return [mat.name, mat.category || '', ...cells]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `materialen-matrix-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
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
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <Button onClick={exportCSV} disabled={materials.length === 0 || jobRoles.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          {t('exportCSV')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('matrixTitle')}</CardTitle>
          <CardDescription>
            {t('matrixDescription', { materials: materials.length, roles: jobRoles.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {materials.length === 0 || jobRoles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b font-semibold bg-muted/50 sticky left-0 z-10 min-w-[180px]">
                      {t('material')}
                    </th>
                    <th className="text-left p-2 border-b font-semibold bg-muted/50 min-w-[100px]">
                      {t('category')}
                    </th>
                    {jobRoles.map(role => (
                      <th
                        key={role.id}
                        className="text-center p-2 border-b font-semibold bg-muted/50 min-w-[120px]"
                      >
                        <div className="text-xs leading-tight">
                          <div>{role.title}</div>
                          <div className="text-muted-foreground font-normal">{role.entity.name}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((mat, idx) => (
                    <tr key={mat.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-2 border-b font-medium sticky left-0 z-10 bg-inherit">
                        {mat.name}
                      </td>
                      <td className="p-2 border-b text-muted-foreground">
                        {mat.category && (
                          <Badge variant="outline" className="text-xs">{mat.category}</Badge>
                        )}
                      </td>
                      {jobRoles.map(role => {
                        const jrm = getMaterialForRole(role.id, mat.id)
                        return (
                          <td key={role.id} className="p-2 border-b text-center">
                            {jrm ? (
                              <span title={jrm.notes || undefined}>
                                <Check className={`h-4 w-4 mx-auto ${jrm.isRequired ? 'text-green-600' : 'text-blue-400'}`} />
                              </span>
                            ) : (
                              <Minus className="h-4 w-4 mx-auto text-muted-foreground/30" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-600" />
              {t('legendRequired')}
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-blue-400" />
              {t('legendOptional')}
            </div>
            <div className="flex items-center gap-1.5">
              <Minus className="h-3.5 w-3.5 text-muted-foreground/30" />
              {t('legendNotAssigned')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
