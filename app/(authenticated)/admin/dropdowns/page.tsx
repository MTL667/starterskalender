'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DropdownOption {
  id: string
  group: string
  label: string
  value: string
  order: number
  isActive: boolean
}

const GROUPS = ['Regio', 'Via', 'Functie', 'Domein'] as const
const GROUP_KEYS: Record<string, 'groupRegion' | 'groupVia' | 'groupRole' | 'groupDomain'> = {
  Regio: 'groupRegion',
  Via: 'groupVia',
  Functie: 'groupRole',
  Domein: 'groupDomain',
}

export default function DropdownsAdminPage() {
  const t = useTranslations('adminDropdowns')
  const tc = useTranslations('common')
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<(typeof GROUPS)[number]>(GROUPS[0])
  const [formData, setFormData] = useState<{
    group: (typeof GROUPS)[number]
    label: string
    value: string
    order: number
  }>({
    group: GROUPS[0],
    label: '',
    value: '',
    order: 0,
  })

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/dropdowns')
      const data = await res.json()
      setOptions(data)
    } catch (error) {
      console.error('Error fetching dropdown options:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = (group: (typeof GROUPS)[number]) => {
    setFormData({
      group,
      label: '',
      value: '',
      order: options.filter(o => o.group === group).length,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/dropdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save option')

      setDialogOpen(false)
      fetchOptions()
    } catch (error) {
      console.error('Error saving option:', error)
      alert(tc('errorSaving'))
    }
  }

  const getOptionsForGroup = (group: string) => {
    return options
      .filter(o => o.group === group && o.isActive)
      .sort((a, b) => a.order - b.order)
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tc('backToAdmin')}
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
          ) : (
            <Tabs defaultValue={GROUPS[0]} value={selectedGroup} onValueChange={(v) => setSelectedGroup(v as (typeof GROUPS)[number])}>
              <TabsList className="grid w-full grid-cols-4">
                {GROUPS.map(group => (
                  <TabsTrigger key={group} value={group}>
                    {t(GROUP_KEYS[group])}
                  </TabsTrigger>
                ))}
              </TabsList>

              {GROUPS.map(group => (
                <TabsContent key={group} value={group} className="space-y-4">
                  <div className="flex justify-end">
                    <Button onClick={() => handleNew(group)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {tc('add')}
                    </Button>
                  </div>

                  {getOptionsForGroup(group).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('noOptions')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getOptionsForGroup(group).map(option => (
                        <div
                          key={option.id}
                          className="border rounded-lg p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {t('value')}: {option.value}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            #{option.order}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newOption')}</DialogTitle>
            <DialogDescription>
              {t('addOptionTo')} {t(GROUP_KEYS[formData.group])}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="label">{t('label')}</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value, value: e.target.value.toLowerCase() })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="value">{t('value')} *</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="order">{t('order')}</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button type="submit">{tc('add')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

