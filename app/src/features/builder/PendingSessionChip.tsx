import * as React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Link2, Users } from 'lucide-react'

import { qualifiedTeacherIds } from '@/lib/constraints/helpers'
import type { ScheduleContext } from '@/lib/constraints/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PendingNeed } from '@/features/builder/gridUtils'

export type PendingDragData = {
  kind: 'pending-session'
  classId: string
  subjectId: string
  length: number
  teacherId: string
  roomId: string
  extraClassIds: string[]
  pair: { subjectId: string; teacherId: string; roomId: string } | null
}

const NONE = '__none__'

export function PendingSessionChip({
  ctx,
  need,
  otherNeeds,
  length,
  onLengthChange,
  teacherId,
  onTeacherChange,
  roomId,
  onRoomChange,
}: {
  ctx: ScheduleContext
  need: PendingNeed
  /** Autres besoins de la MEME classe (candidats pour un tandem). */
  otherNeeds: PendingNeed[]
  length: number
  onLengthChange: (length: number) => void
  teacherId: string
  onTeacherChange: (teacherId: string) => void
  roomId: string
  onRoomChange: (roomId: string) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [extraClassIds, setExtraClassIds] = React.useState<string[]>([])
  const [pairSubjectId, setPairSubjectId] = React.useState(NONE)
  const [pairTeacherId, setPairTeacherId] = React.useState('')
  const [pairRoomId, setPairRoomId] = React.useState('')

  const teachers = ctx.teachers.filter((t) => need.qualifiedTeacherIds.includes(t.id))
  const canDrag = teachers.length > 0

  const level = ctx.classes.find((c) => c.id === need.classId)?.level_id
  const sameLevelClasses = ctx.classes.filter((c) => c.id !== need.classId && c.level_id === level)

  const pairCandidates = otherNeeds.filter((n) => n.subjectId !== need.subjectId)
  const pairQualified =
    pairSubjectId === NONE ? [] : ctx.teachers.filter((t) => qualifiedTeacherIds(ctx, pairSubjectId, level ?? '').includes(t.id))

  const dragId = `pending:${need.classId}:${need.subjectId}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled: !canDrag || (pairSubjectId !== NONE && (!pairTeacherId || !pairRoomId)),
    data: {
      kind: 'pending-session',
      classId: need.classId,
      subjectId: need.subjectId,
      length,
      teacherId,
      roomId,
      extraClassIds,
      pair: pairSubjectId === NONE ? null : { subjectId: pairSubjectId, teacherId: pairTeacherId, roomId: pairRoomId },
    } satisfies PendingDragData,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-2 text-xs shadow-xs"
      data-dragging={isDragging || undefined}
    >
      <div className="flex items-center gap-2">
        {canDrag && (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {need.className} - {need.subjectCode}
          </div>
          <div className="text-muted-foreground">{need.remainingHours}h restante(s)</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={() => setExpanded((e) => !e)}
          title="Tronc commun / tandem"
        >
          <Users className="size-3.5" />
        </Button>
      </div>

      {!canDrag ? (
        <p className="text-destructive">
          Aucun enseignant habilite (matiere + niveau) pour ce besoin -- configurez-le dans
          Enseignants.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={need.remainingHours}
              value={length}
              onChange={(e) =>
                onLengthChange(Math.max(1, Math.min(need.remainingHours, Number(e.target.value) || 1)))
              }
              className="h-7 w-14 shrink-0 px-1.5 text-xs"
            />
            <Select value={teacherId} onValueChange={onTeacherChange}>
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue placeholder="Prof" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roomId} onValueChange={onRoomChange}>
              <SelectTrigger size="sm" className="w-28 shrink-0 text-xs">
                <SelectValue placeholder="Salle" />
              </SelectTrigger>
              <SelectContent>
                {ctx.rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {expanded && (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-input p-2">
              {sameLevelClasses.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-muted-foreground">
                    Tronc commun (autres classes du niveau)
                  </span>
                  <div className="flex flex-col gap-1">
                    {sameLevelClasses.map((c) => (
                      <label key={c.id} className="flex items-center gap-1.5">
                        <Checkbox
                          checked={extraClassIds.includes(c.id)}
                          onCheckedChange={(checked) =>
                            setExtraClassIds((ids) =>
                              checked ? [...ids, c.id] : ids.filter((id) => id !== c.id),
                            )
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {pairCandidates.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 font-medium text-muted-foreground">
                    <Link2 className="size-3" /> Tandem / LV2 simultanee
                  </span>
                  <Select value={pairSubjectId} onValueChange={setPairSubjectId}>
                    <SelectTrigger size="sm" className="w-full text-xs">
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Aucun</SelectItem>
                      {pairCandidates.map((n) => (
                        <SelectItem key={n.subjectId} value={n.subjectId}>
                          {n.subjectCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pairSubjectId !== NONE && (
                    <div className="flex items-center gap-1.5">
                      <Select value={pairTeacherId} onValueChange={setPairTeacherId}>
                        <SelectTrigger size="sm" className="w-full text-xs">
                          <SelectValue placeholder="Prof lie" />
                        </SelectTrigger>
                        <SelectContent>
                          {pairQualified.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={pairRoomId} onValueChange={setPairRoomId}>
                        <SelectTrigger size="sm" className="w-28 shrink-0 text-xs">
                          <SelectValue placeholder="Salle liee" />
                        </SelectTrigger>
                        <SelectContent>
                          {ctx.rooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
