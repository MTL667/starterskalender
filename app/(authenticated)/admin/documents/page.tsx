'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Search, ChevronRight, Loader2 } from 'lucide-react'
import { StarterDocuments } from '@/components/kalender/starter-documents'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Starter {
  id: string
  firstName: string
  lastName: string
  type: string
  startDate: string | null
  isCancelled: boolean
  entity?: { id: string; name: string; colorHex: string } | null
}

interface Entity {
  id: string
  name: string
  colorHex: string
}

export default function AdminDocumentsPage() {
  const t = useTranslations('adminDocuments')
  const { data: session } = useSession()
  const router = useRouter()
  const [starters, setStarters] = useState<Starter[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('ALL')
  const [selectedStarter, setSelectedStarter] = useState<Starter | null>(null)

  const isAdmin = session?.user?.role === 'HR_ADMIN'

  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/dashboard')
    }
  }, [session, isAdmin, router])

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all([
      fetch(`/api/starters?year=${year}`).then(r => r.json()),
      fetch(`/api/starters?year=${year + 1}`).then(r => r.json()),
      fetch('/api/entities').then(r => r.json()),
    ])
      .then(([current, next, ents]) => {
        const all = [...current, ...next]
          .filter((s: Starter) => !s.isCancelled)
          .sort((a: Starter, b: Starter) => {
            if (!a.startDate) return 1
            if (!b.startDate) return -1
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          })
        setStarters(all)
        setEntities(ents)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading data:', err)
        setLoading(false)
      })
  }, [])

  const filtered = starters.filter(s => {
    const matchesSearch = searchQuery === '' ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesEntity = entityFilter === 'ALL' || s.entity?.id === entityFilter
    return matchesSearch && matchesEntity
  })

  if (!isAdmin) return null

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Starter lijst */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('selectStarter')}</CardTitle>
              <div className="space-y-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('allEntities')}</SelectItem>
                    {entities.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('noStarters')}</p>
              ) : (
                <div className="space-y-1">
                  {filtered.map(starter => (
                    <button
                      key={starter.id}
                      onClick={() => setSelectedStarter(starter)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                        selectedStarter?.id === starter.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {starter.firstName} {starter.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {starter.entity && (
                            <Badge
                              className="text-xs h-5"
                              style={{ backgroundColor: starter.entity.colorHex, color: 'white' }}
                            >
                              {starter.entity.name}
                            </Badge>
                          )}
                          {starter.startDate && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(starter.startDate).toLocaleDateString('nl-BE', { dateStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document management */}
        <div className="lg:col-span-2">
          {selectedStarter ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedStarter.firstName} {selectedStarter.lastName}
                </CardTitle>
                <CardDescription>
                  {t('manageDocuments')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StarterDocuments
                  starterId={selectedStarter.id}
                  canEdit={true}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">{t('selectStarterPrompt')}</p>
                <p className="text-sm mt-1">{t('selectStarterHint')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
