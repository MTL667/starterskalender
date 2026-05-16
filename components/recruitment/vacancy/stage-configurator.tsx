'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, X, ChevronUp, ChevronDown, Lock, Mail } from 'lucide-react'

interface Stage {
  id: string
  name: string
  order: number
  isTerminal: boolean
  triggersEmail: boolean
}

interface StageConfiguratorProps {
  vacancyId: string
  initialStages: Stage[]
}

export function StageConfigurator({ vacancyId, initialStages }: StageConfiguratorProps) {
  const t = useTranslations('recruitment')
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageEmail, setNewStageEmail] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ stage: Stage; candidateCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiBase = `/api/recruitment/vacancies/${vacancyId}/stages`

  const isProtected = (stage: Stage) => stage.order === 0 || stage.isTerminal

  const handleAdd = useCallback(async () => {
    if (!newStageName.trim()) return

    const terminalStages = stages.filter((s) => s.isTerminal)
    const nonTerminalStages = stages.filter((s) => !s.isTerminal)
    const insertOrder = nonTerminalStages.length

    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStageName.trim(), order: insertOrder, triggersEmail: newStageEmail }),
      })
      if (!res.ok) { setError(t('pipeline.addError')); return }
      const result = await res.json()

      const updatedStages = [
        ...nonTerminalStages,
        result.data,
        ...terminalStages.map((s, i) => ({ ...s, order: insertOrder + 1 + i })),
      ]
      setStages(updatedStages.sort((a, b) => a.order - b.order))
      setNewStageName('')
      setNewStageEmail(false)
      setShowAddForm(false)
      setError(null)
    } catch {
      setError(t('pipeline.addError'))
    }
  }, [apiBase, newStageName, newStageEmail, stages, t])

  const handleDelete = useCallback(async (stage: Stage) => {
    try {
      const res = await fetch(`${apiBase}?stageId=${stage.id}`, { method: 'DELETE' })
      if (!res.ok) { setError(t('pipeline.deleteError')); return }
      const result = await res.json()

      if (result.data?.requiresConfirmation) {
        setDeleteTarget({ stage, candidateCount: result.data.candidateCount })
        return
      }

      setStages(result.data)
      setError(null)
    } catch {
      setError(t('pipeline.deleteError'))
    }
  }, [apiBase, t])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`${apiBase}?stageId=${deleteTarget.stage.id}&confirm=true`, { method: 'DELETE' })
      if (!res.ok) { setError(t('pipeline.deleteError')); return }
      const result = await res.json()
      setStages(result.data)
      setDeleteTarget(null)
      setError(null)
    } catch {
      setError(t('pipeline.deleteError'))
    }
  }, [apiBase, deleteTarget, t])

  const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
    const newStages = [...stages]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= stages.length) return
    if (isProtected(newStages[targetIndex]) || isProtected(newStages[index])) return

    const tempOrder = newStages[index].order
    newStages[index] = { ...newStages[index], order: newStages[targetIndex].order }
    newStages[targetIndex] = { ...newStages[targetIndex], order: tempOrder }
    newStages.sort((a, b) => a.order - b.order)
    setStages(newStages)
    setSaveStatus('idle')
  }, [stages])

  const handleToggleEmail = useCallback(async (stage: Stage) => {
    try {
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: stage.id, triggersEmail: !stage.triggersEmail }),
      })
      if (!res.ok) { setError(t('pipeline.updateError')); return }
      const result = await res.json()
      setStages((prev) => prev.map((s) => (s.id === result.data.id ? { ...s, ...result.data } : s)))
      setError(null)
    } catch {
      setError(t('pipeline.updateError'))
    }
  }, [apiBase, t])

  const saveOrder = useCallback(async () => {
    setSaveStatus('saving')
    try {
      const reorderPayload = stages.map((s) => ({ id: s.id, order: s.order }))
      const res = await fetch(apiBase, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorderPayload),
      })
      if (!res.ok) { setSaveStatus('error'); return }
      const result = await res.json()
      setStages(result.data)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [apiBase, stages])

  const hasOrderChanged = stages.some((s, i) => {
    const original = initialStages.find((o) => o.id === s.id)
    return original && original.order !== s.order
  })

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={`flex items-center gap-3 rounded-lg border p-3 ${isProtected(stage) ? 'bg-muted/50' : ''}`}
          >
            <div className="flex flex-col gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={isProtected(stage) || index === 0 || isProtected(stages[index - 1])}
                onClick={() => handleMove(index, 'up')}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={isProtected(stage) || index === stages.length - 1 || isProtected(stages[index + 1])}
                onClick={() => handleMove(index, 'down')}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            <span className="flex-1 font-medium">{stage.name}</span>

            {stage.isTerminal && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                {t('pipeline.terminal')}
              </Badge>
            )}

            <div className="flex items-center gap-1.5">
              <Mail className={`h-3.5 w-3.5 ${stage.triggersEmail ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                checked={stage.triggersEmail}
                onCheckedChange={() => handleToggleEmail(stage)}
                aria-label={t('pipeline.emailTrigger')}
              />
            </div>

            {!isProtected(stage) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(stage)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isProtected(stage) && <div className="w-8" />}
          </div>
        ))}
      </div>

      {showAddForm ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
          <Input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder={t('pipeline.stageNamePlaceholder')}
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            autoFocus
          />
          <div className="flex items-center gap-1.5">
            <Label className="text-xs whitespace-nowrap">{t('pipeline.emailTrigger')}</Label>
            <Switch checked={newStageEmail} onCheckedChange={setNewStageEmail} />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!newStageName.trim()}>
            {t('pipeline.add')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewStageName('') }}>
            {t('pipeline.cancel')}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t('pipeline.addStage')}
        </Button>
      )}

      {hasOrderChanged && (
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={saveOrder} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? t('pipeline.saving') : t('pipeline.saveOrder')}
          </Button>
          {saveStatus === 'saved' && <span className="text-sm text-green-600">{t('pipeline.saved')}</span>}
          {saveStatus === 'error' && <span className="text-sm text-destructive">{t('pipeline.saveError')}</span>}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pipeline.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pipeline.deleteConfirmDescription', { name: deleteTarget?.stage.name ?? '', count: deleteTarget?.candidateCount ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('pipeline.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('pipeline.confirmDelete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
