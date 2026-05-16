'use client'

import { useState, useCallback, useMemo } from 'react'
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
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  GripVertical,
  Plus,
  Trash2,
  AlignLeft,
  List,
  ShieldCheck,
  Gift,
  ImageIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ContentBlock, RequirementItem, BenefitItem, MediaContent } from '@/lib/recruitment/types'
import { TextBlock } from './blocks/text-block'
import { ListBlock } from './blocks/list-block'
import { RequirementsBlock } from './blocks/requirements-block'
import { BenefitsBlock } from './blocks/benefits-block'
import { MediaBlock } from './blocks/media-block'

const BLOCK_TYPE_CONFIG = {
  text: { icon: AlignLeft, defaultContent: '' },
  list: { icon: List, defaultContent: [] as string[] },
  requirements: { icon: ShieldCheck, defaultContent: { items: [] as RequirementItem[] } },
  benefits: { icon: Gift, defaultContent: { items: [] as BenefitItem[] } },
  media: { icon: ImageIcon, defaultContent: null as MediaContent | null },
} as const

type BlockType = keyof typeof BLOCK_TYPE_CONFIG

interface ContentBlockEditorProps {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  vacancyId?: string
  entityId?: string
}

function SortableBlock({
  block,
  editingId,
  onStartEdit,
  onStopEdit,
  onContentChange,
  onDelete,
  t,
  vacancyId,
}: {
  block: ContentBlock
  editingId: string | null
  onStartEdit: (id: string) => void
  onStopEdit: () => void
  onContentChange: (id: string, content: ContentBlock['content']) => void
  onDelete: (id: string) => void
  t: ReturnType<typeof useTranslations>
  vacancyId?: string
  entityId?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isEditing = editingId === block.id
  const config = BLOCK_TYPE_CONFIG[block.type as BlockType]
  const Icon = config?.icon ?? AlignLeft

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isEditing) {
      e.preventDefault()
      onStartEdit(block.id)
    }
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault()
      onStopEdit()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border bg-card p-4 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } ${isEditing ? 'ring-2 ring-primary' : ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listitem"
      onClick={() => {
        if (!isEditing) onStartEdit(block.id)
      }}
    >
      <div className="flex items-start gap-3">
        <button
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={t('contentBlocks.dragHandle')}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="mt-1 shrink-0 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t(`contentBlocks.type_${block.type}`)}
          </div>
          {renderBlockContent(block, isEditing, onContentChange, t, vacancyId, entityId)}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(block.id)
          }}
          aria-label={t('contentBlocks.deleteBlock')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function renderBlockContent(
  block: ContentBlock,
  editing: boolean,
  onContentChange: (id: string, content: ContentBlock['content']) => void,
  _t: ReturnType<typeof useTranslations>,
  vacancyId?: string,
  entityId?: string,
) {
  switch (block.type) {
    case 'text':
      return (
        <TextBlock
          content={block.content as string}
          editing={editing}
          onChange={(c) => onContentChange(block.id, c)}
        />
      )
    case 'list':
      return (
        <ListBlock
          content={block.content as string[]}
          editing={editing}
          onChange={(c) => onContentChange(block.id, c)}
        />
      )
    case 'requirements':
      return (
        <RequirementsBlock
          content={block.content as { items: RequirementItem[] }}
          editing={editing}
          onChange={(c) => onContentChange(block.id, c)}
        />
      )
    case 'benefits':
      return (
        <BenefitsBlock
          content={block.content as { items: BenefitItem[] }}
          editing={editing}
          onChange={(c) => onContentChange(block.id, c)}
        />
      )
    case 'media':
      return (
        <MediaBlock
          content={block.content as MediaContent | null}
          editing={editing}
          onChange={(c) => onContentChange(block.id, c)}
          vacancyId={vacancyId}
          entityId={entityId}
        />
      )
    default:
      return null
  }
}

export function ContentBlockEditor({ blocks, onChange, vacancyId, entityId }: ContentBlockEditorProps) {
  const t = useTranslations('recruitment')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order - b.order),
    [blocks],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = blocks.findIndex((b) => b.id === active.id)
        const newIndex = blocks.findIndex((b) => b.id === over.id)
        const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
          ...b,
          order: i,
        }))
        onChange(reordered)
      }
    },
    [blocks, onChange],
  )

  const handleContentChange = useCallback(
    (id: string, content: ContentBlock['content']) => {
      onChange(blocks.map((b) => (b.id === id ? { ...b, content } : b)))
    },
    [blocks, onChange],
  )

  const handleDelete = useCallback(
    (id: string) => {
      const updated = blocks
        .filter((b) => b.id !== id)
        .map((b, i) => ({ ...b, order: i }))
      onChange(updated)
      if (editingId === id) setEditingId(null)
    },
    [blocks, onChange, editingId],
  )

  const addBlock = useCallback(
    (type: BlockType) => {
      const newBlock: ContentBlock = {
        id: crypto.randomUUID(),
        type,
        content: structuredClone(BLOCK_TYPE_CONFIG[type].defaultContent) as ContentBlock['content'],
        order: blocks.length,
      }
      onChange([...blocks, newBlock])
      setEditingId(newBlock.id)
      setAddMenuOpen(false)
    },
    [blocks, onChange],
  )

  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">{t('contentBlocks.emptyState')}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedBlocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2" role="list">
              {sortedBlocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    editingId={editingId}
                    onStartEdit={setEditingId}
                    onStopEdit={() => setEditingId(null)}
                    onContentChange={handleContentChange}
                    onDelete={handleDelete}
                    t={t}
                    vacancyId={vacancyId}
                    entityId={entityId}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {t('contentBlocks.addBlock')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="center">
          <div className="space-y-1">
            {(Object.keys(BLOCK_TYPE_CONFIG) as BlockType[]).map((type) => {
              const { icon: TypeIcon } = BLOCK_TYPE_CONFIG[type]
              return (
                <Button
                  key={type}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => addBlock(type)}
                >
                  <TypeIcon className="h-4 w-4 mr-2" />
                  {t(`contentBlocks.type_${type}`)}
                </Button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
