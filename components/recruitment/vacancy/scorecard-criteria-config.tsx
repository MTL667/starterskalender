'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { VacancyScorecardCriterion } from '@/lib/recruitment/types'

interface ScorecardCriteriaConfigProps {
  criteria: VacancyScorecardCriterion[]
  onChange: (criteria: VacancyScorecardCriterion[]) => void
  evaluationCount?: number
}

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function SortableCriterionRow({
  criterion,
  onUpdate,
  onRemove,
  t,
}: {
  criterion: VacancyScorecardCriterion
  onUpdate: (updated: VacancyScorecardCriterion) => void
  onRemove: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: criterion.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 rounded-md border bg-card p-3">
      <button
        type="button"
        className="mt-2 cursor-grab text-muted-foreground hover:text-foreground focus:outline-none"
        aria-label={t('scorecard.reorderHandleAria')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 space-y-2">
        <Input
          value={criterion.name}
          onChange={(e) => onUpdate({ ...criterion, name: e.target.value })}
          placeholder={t('scorecard.criterion.name')}
          className="font-medium"
        />
        <Textarea
          value={criterion.description}
          onChange={(e) => onUpdate({ ...criterion, description: e.target.value })}
          placeholder={t('scorecard.criterion.descriptionHint')}
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{t('scorecard.criterion.weight')}</span>
        <Select
          value={String(criterion.weight)}
          onValueChange={(v) => onUpdate({ ...criterion, weight: parseInt(v, 10) })}
        >
          <SelectTrigger className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((w) => (
              <SelectItem key={w} value={String(w)}>
                {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-muted-foreground hover:text-destructive"
        aria-label={t('scorecard.removeCriterion')}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ScorecardCriteriaConfig({
  criteria,
  onChange,
  evaluationCount = 0,
}: ScorecardCriteriaConfigProps) {
  const t = useTranslations('recruitment')
  const [items, setItems] = useState<VacancyScorecardCriterion[]>(criteria)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sync = useCallback(
    (updated: VacancyScorecardCriterion[]) => {
      setItems(updated)
      onChange(updated)
    },
    [onChange]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex((c) => c.id === active.id)
      const newIndex = items.findIndex((c) => c.id === over.id)
      const reordered = arrayMove(items, oldIndex, newIndex).map((c, i) => ({
        ...c,
        order: i,
      }))
      sync(reordered)
    },
    [items, sync]
  )

  const addCriterion = useCallback(() => {
    const newCriterion: VacancyScorecardCriterion = {
      id: generateId(),
      name: '',
      description: '',
      weight: 3,
      order: items.length,
    }
    sync([...items, newCriterion])
  }, [items, sync])

  const updateCriterion = useCallback(
    (id: string, updated: VacancyScorecardCriterion) => {
      sync(items.map((c) => (c.id === id ? updated : c)))
    },
    [items, sync]
  )

  const removeCriterion = useCallback(
    (id: string) => {
      const filtered = items.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i }))
      sync(filtered)
    },
    [items, sync]
  )

  return (
    <div className="space-y-4">
      {evaluationCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <strong>{t('scorecard.warningExistingEvaluations')}</strong>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('scorecard.emptyState')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((criterion) => (
                <SortableCriterionRow
                  key={criterion.id}
                  criterion={criterion}
                  onUpdate={(updated) => updateCriterion(criterion.id, updated)}
                  onRemove={() => removeCriterion(criterion.id)}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
        <Plus className="mr-1 h-4 w-4" />
        {t('scorecard.addCriterion')}
      </Button>
    </div>
  )
}
