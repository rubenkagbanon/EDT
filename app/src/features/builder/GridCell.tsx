import { useDroppable } from '@dnd-kit/core'

import { cn } from '@/lib/utils'
import type { CellContent } from '@/features/builder/gridUtils'

export function GridCell({
  day,
  orderIndex,
  content,
  hasViolation,
  onClick,
}: {
  day: number
  orderIndex: number
  content?: CellContent
  hasViolation?: boolean
  onClick?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${day}:${orderIndex}`,
    data: { kind: 'cell', day, orderIndex },
    disabled: Boolean(content),
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-12 min-w-24 items-center justify-center rounded-md border px-1 text-center text-xs transition-colors',
        content
          ? hasViolation
            ? 'border-destructive bg-destructive/10 text-destructive font-medium'
            : 'border-border bg-accent font-medium'
          : 'border-dashed border-border text-muted-foreground hover:bg-accent/50',
        isOver && !content && 'bg-accent border-solid',
      )}
    >
      {content?.label ?? ''}
    </button>
  )
}
