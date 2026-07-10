import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PendingSession } from '@/features/builder/gridUtils'
import type { Tables } from '@/types/database.types'

export type PendingDragData = {
  kind: 'pending-session'
  groupId: string
  length: number
  roomId: string
}

export function PendingSessionChip({
  session,
  rooms,
  roomId,
  onRoomChange,
}: {
  session: PendingSession
  rooms: Tables<'rooms'>[]
  roomId: string
  onRoomChange: (roomId: string) => void
}) {
  const dragId = `pending:${session.groupId}:${session.index}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { kind: 'pending-session', groupId: session.groupId, length: session.length, roomId } satisfies PendingDragData,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs shadow-xs"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{session.groupLabel}</div>
        <div className="text-muted-foreground">
          {session.subjectCode} - {session.length}h
        </div>
      </div>
      <Select value={roomId} onValueChange={onRoomChange}>
        <SelectTrigger size="sm" className="w-28 shrink-0 text-xs">
          <SelectValue placeholder="Salle" />
        </SelectTrigger>
        <SelectContent>
          {rooms.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
