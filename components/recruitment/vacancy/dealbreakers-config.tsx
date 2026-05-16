'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, X, ShieldAlert, Star } from 'lucide-react'
import type { VacancyDealbreaker, VacancyNiceToHave } from '@/lib/recruitment/types'

interface DealbreakersConfigProps {
  dealbreakers: VacancyDealbreaker[]
  niceToHaves: VacancyNiceToHave[]
  onDealbreakersChange: (items: VacancyDealbreaker[]) => void
  onNiceToHavesChange: (items: VacancyNiceToHave[]) => void
}

function DealbreakerValueInput({
  item,
  onChange,
  t,
}: {
  item: VacancyDealbreaker
  onChange: (updated: VacancyDealbreaker) => void
  t: ReturnType<typeof useTranslations>
}) {
  if (item.type === 'boolean') {
    return (
      <Select
        value={item.requiredValue === true ? 'yes' : 'no'}
        onValueChange={(v) => onChange({ ...item, requiredValue: v === 'yes' })}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">{t('criteria.booleanYes')}</SelectItem>
          <SelectItem value="no">{t('criteria.booleanNo')}</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (item.type === 'minimum') {
    return (
      <Input
        type="number"
        value={typeof item.requiredValue === 'number' ? item.requiredValue : 0}
        onChange={(e) => onChange({ ...item, requiredValue: Number(e.target.value) || 0 })}
        placeholder={t('criteria.minimumPlaceholder')}
        className="w-28"
      />
    )
  }

  // selection
  const options = Array.isArray(item.requiredValue) ? item.requiredValue : []
  return (
    <div className="flex-1 space-y-1">
      <div className="flex flex-wrap gap-1">
        {options.map((opt, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            {opt}
            <button
              type="button"
              onClick={() => onChange({ ...item, requiredValue: options.filter((_, j) => j !== i) })}
              className="ml-0.5 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder={t('criteria.selectionPlaceholder')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const val = (e.target as HTMLInputElement).value.trim()
            if (val && !options.includes(val)) {
              onChange({ ...item, requiredValue: [...options, val] })
              ;(e.target as HTMLInputElement).value = ''
            }
          }
        }}
        className="mt-1"
      />
    </div>
  )
}

function getDefaultRequiredValue(type: VacancyDealbreaker['type']): VacancyDealbreaker['requiredValue'] {
  switch (type) {
    case 'boolean': return true
    case 'minimum': return 0
    case 'selection': return []
  }
}

export function DealbreakersConfig({
  dealbreakers,
  niceToHaves,
  onDealbreakersChange,
  onNiceToHavesChange,
}: DealbreakersConfigProps) {
  const t = useTranslations('recruitment')

  const totalWeight = niceToHaves.reduce((sum, n) => sum + n.weight, 0)

  const addDealbreaker = () => {
    onDealbreakersChange([
      ...dealbreakers,
      { id: crypto.randomUUID(), name: '', type: 'boolean', requiredValue: true, label: '' },
    ])
  }

  const updateDealbreaker = (index: number, updated: VacancyDealbreaker) => {
    const items = [...dealbreakers]
    items[index] = updated
    onDealbreakersChange(items)
  }

  const removeDealbreaker = (index: number) => {
    onDealbreakersChange(dealbreakers.filter((_, i) => i !== index))
  }

  const addNiceToHave = () => {
    onNiceToHavesChange([
      ...niceToHaves,
      { id: crypto.randomUUID(), name: '', type: 'scale', weight: 5 },
    ])
  }

  const updateNiceToHave = (index: number, updated: VacancyNiceToHave) => {
    const items = [...niceToHaves]
    items[index] = updated
    onNiceToHavesChange(items)
  }

  const removeNiceToHave = (index: number) => {
    onNiceToHavesChange(niceToHaves.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-8">
      {/* Dealbreakers Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold">{t('criteria.dealbreakersTitle')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('criteria.dealbreakersDescription')}</p>

        <div className="space-y-4">
          {dealbreakers.map((item, i) => (
            <div key={item.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">{t('criteria.fieldName')}</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateDealbreaker(i, { ...item, name: e.target.value })}
                        placeholder={t('criteria.dealbreakerNamePlaceholder')}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-40">
                      <Label className="text-xs">{t('criteria.fieldType')}</Label>
                      <Select
                        value={item.type}
                        onValueChange={(v) => {
                          const newType = v as VacancyDealbreaker['type']
                          updateDealbreaker(i, { ...item, type: newType, requiredValue: getDefaultRequiredValue(newType) })
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boolean">{t('criteria.typeBoolean')}</SelectItem>
                          <SelectItem value="minimum">{t('criteria.typeMinimum')}</SelectItem>
                          <SelectItem value="selection">{t('criteria.typeSelection')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={`flex gap-2 ${item.type === 'selection' ? 'flex-col' : 'items-end'}`}>
                    <div className={item.type === 'selection' ? 'w-full' : 'w-40 shrink-0'}>
                      <Label className="text-xs">{t('criteria.fieldRequiredValue')}</Label>
                      <div className="mt-1">
                        <DealbreakerValueInput item={item} onChange={(u) => updateDealbreaker(i, u)} t={t} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">{t('criteria.fieldLabel')}</Label>
                      <Textarea
                        value={item.label}
                        onChange={(e) => updateDealbreaker(i, { ...item, label: e.target.value })}
                        placeholder={t('criteria.labelPlaceholder')}
                        rows={1}
                        className="mt-1 min-h-[36px]"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 mt-5"
                  onClick={() => removeDealbreaker(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addDealbreaker}>
          <Plus className="h-4 w-4 mr-1" />
          {t('criteria.addDealbreaker')}
        </Button>
      </div>

      {/* Nice-to-Haves Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">{t('criteria.niceToHavesTitle')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('criteria.niceToHavesDescription')}</p>

        <div className="space-y-3">
          {niceToHaves.map((item, i) => {
            const pct = totalWeight > 0 ? Math.round((item.weight / totalWeight) * 100) : 0
            return (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={item.name}
                      onChange={(e) => updateNiceToHave(i, { ...item, name: e.target.value })}
                      placeholder={t('criteria.niceToHaveNamePlaceholder')}
                    />
                  </div>
                  <div className="w-36">
                    <Select
                      value={item.type}
                      onValueChange={(v) => updateNiceToHave(i, { ...item, type: v as VacancyNiceToHave['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scale">{t('criteria.typeScale')}</SelectItem>
                        <SelectItem value="boolean">{t('criteria.typeBoolean')}</SelectItem>
                        <SelectItem value="selection">{t('criteria.typeSelection')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={item.weight}
                      onChange={(e) => {
                        const w = Math.min(10, Math.max(1, Number(e.target.value) || 1))
                        updateNiceToHave(i, { ...item, weight: w })
                      }}
                    />
                  </div>
                  <Badge variant="outline" className="w-14 justify-center text-xs">
                    {pct}%
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeNiceToHave(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {totalWeight > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('criteria.totalWeight')}: {totalWeight}</span>
          </div>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addNiceToHave}>
          <Plus className="h-4 w-4 mr-1" />
          {t('criteria.addNiceToHave')}
        </Button>
      </div>
    </div>
  )
}
