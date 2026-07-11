import * as React from 'react'
import { useParams } from 'react-router-dom'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { useProfile } from '@/features/profile/hooks'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { academicYearsResource, scheduleEntriesResource } from '@/features/setup/resources'
import { useViolations } from '@/features/validation/useValidationSummary'
import { violationsForEntry } from '@/lib/constraints'
import {
  DAY_LABELS,
  buildGridDays,
  buildGridRows,
  cellContentFor,
  pendingSessionsForGroups,
  slotAt,
  type ViewMode,
} from '@/features/builder/gridUtils'
import { autoGenerateSchedule } from '@/features/builder/autoGenerate'
import { entriesWithGroups, classesOfGroup, teachersOfGroup } from '@/lib/constraints/helpers'
import { GridCell } from '@/features/builder/GridCell'
import { PendingSessionChip, type PendingDragData } from '@/features/builder/PendingSessionChip'

export default function BuilderPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: profile } = useProfile()
  const canEdit = profile?.role === 'admin' || profile?.role === 'scheduler'
  const { violations, ctx, isLoading } = useViolations(establishmentId!)
  const { data: academicYears } = academicYearsResource.useList(establishmentId!)
  const activeYear = academicYears?.find((y) => y.is_active) ?? academicYears?.[0]
  const { createMutation, createManyMutation, removeMutation } = scheduleEntriesResource.useMutations(
    establishmentId!,
  )

  const [view, setView] = React.useState<ViewMode>('class')
  const [entityId, setEntityId] = React.useState<string>('')
  const [roomByChip, setRoomByChip] = React.useState<Record<string, string>>({})
  const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(null)
  const [generating, setGenerating] = React.useState(false)

  const entityOptions = React.useMemo(() => {
    if (!ctx) return []
    if (view === 'class') return ctx.classes.map((c) => ({ value: c.id, label: c.name }))
    if (view === 'teacher') return ctx.teachers.map((t) => ({ value: t.id, label: t.full_name }))
    return ctx.rooms.map((r) => ({ value: r.id, label: r.name }))
  }, [ctx, view])

  React.useEffect(() => {
    if (!entityId && entityOptions.length > 0) setEntityId(entityOptions[0].value)
    if (entityId && !entityOptions.some((o) => o.value === entityId)) {
      setEntityId(entityOptions[0]?.value ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityOptions])

  if (isLoading || !ctx) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>
  }

  const days = buildGridDays(ctx)
  const rows = buildGridRows(ctx)

  const relevantGroupIds =
    view === 'class'
      ? ctx.teachingGroups.filter((g) => classesOfGroup(ctx, g.id).includes(entityId)).map((g) => g.id)
      : view === 'teacher'
        ? ctx.teachingGroups.filter((g) => teachersOfGroup(ctx, g.id).includes(entityId)).map((g) => g.id)
        : ctx.teachingGroups.map((g) => g.id)

  const pendingSessions = pendingSessionsForGroups(ctx, relevantGroupIds)

  function defaultRoomFor(groupId: string) {
    const group = ctx!.teachingGroups.find((g) => g.id === groupId)
    const subject = ctx!.subjects.find((s) => s.id === group?.subject_id)
    if (subject?.code === 'EPS') {
      return ctx!.rooms.find((r) => r.room_type === 'terrain')?.id ?? ctx!.rooms[0]?.id ?? ''
    }
    return ctx!.rooms.find((r) => r.room_type === 'salle_principale')?.id ?? ctx!.rooms[0]?.id ?? ''
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!canEdit) return
    const { active, over } = event
    if (!over || !activeYear) return
    const data = active.data.current as PendingDragData | undefined
    if (!data) return
    const overData = over.data.current as { day: number; orderIndex: number } | undefined
    if (!overData) return

    try {
      await createMutation.mutateAsync({
        establishment_id: establishmentId,
        academic_year_id: activeYear.id,
        teaching_group_id: data.groupId,
        day_of_week: overData.day,
        start_slot_order: overData.orderIndex,
        slot_count: data.length,
        room_id: data.roomId,
      } as never)
      toast.success('Seance placee.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Placement impossible.'))
    }
  }

  async function handleAutoGenerate() {
    if (!canEdit || !activeYear || !ctx) return
    setGenerating(true)
    try {
      const result = autoGenerateSchedule(ctx, activeYear.id)
      if (result.newEntries.length > 0) {
        await createManyMutation.mutateAsync(result.newEntries as never)
      }
      if (result.placedCount === 0 && result.unplacedCount === 0) {
        toast.info('Aucune seance en attente a placer.')
      } else if (result.unplacedCount > 0) {
        toast.warning(
          `${result.placedCount} seance(s) placee(s) automatiquement, ${result.unplacedCount} n'ont pas pu l'etre (a placer manuellement).`,
        )
      } else {
        toast.success(`${result.placedCount} seance(s) placee(s) automatiquement.`)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Generation impossible.'))
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteEntry(entryId: string) {
    try {
      await removeMutation.mutateAsync(entryId)
      toast.success('Seance retiree.')
      setSelectedEntryId(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Suppression impossible.'))
    }
  }

  const selectedEntry = selectedEntryId
    ? entriesWithGroups(ctx).find((e) => e.id === selectedEntryId)
    : undefined
  const selectedEntryViolations = selectedEntryId ? violationsForEntry(violations, selectedEntryId) : []

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Construction de l'emploi du temps</h1>
            <p className="text-sm text-muted-foreground">
              Glissez une seance en attente vers un creneau libre. Les cellules en rouge signalent une
              violation de regle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!activeYear && (
              <Badge variant="destructive">Aucune annee scolaire active - creez-en une.</Badge>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                disabled={!activeYear || generating}
                onClick={handleAutoGenerate}
              >
                <Sparkles className="size-4" />
                {generating ? 'Generation...' : 'Generer automatiquement'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="class">Par classe</TabsTrigger>
              <TabsTrigger value="teacher">Par professeur</TabsTrigger>
              <TabsTrigger value="room">Par salle</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={entityId} onValueChange={setEntityId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
          <Card>
            <CardContent className="overflow-x-auto">
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `100px repeat(${days.length}, minmax(96px, 1fr))` }}
              >
                <div />
                {days.map((day) => (
                  <div key={day} className="pb-1 text-center text-xs font-semibold">
                    {DAY_LABELS[day]}
                  </div>
                ))}

                {rows.map((row) => (
                  <React.Fragment key={row.orderIndex}>
                    <div className="flex items-center justify-end pr-2 text-xs text-muted-foreground">
                      {row.label}
                    </div>
                    {days.map((day) => {
                      const slot = slotAt(ctx, day, row.orderIndex)
                      if (!slot) return <div key={day} />
                      if (slot.kind !== 'cours') {
                        return (
                          <div
                            key={day}
                            className="flex h-12 items-center justify-center rounded-md bg-muted text-[11px] text-muted-foreground"
                          >
                            {slot.kind === 'recreation' && 'Recreation'}
                            {slot.kind === 'dejeuner' && 'Dejeuner'}
                            {slot.kind === 'banalise' && 'Vie scolaire'}
                          </div>
                        )
                      }
                      const content = cellContentFor(ctx, view, entityId, day, row.orderIndex)
                      const hasViolation = content
                        ? violationsForEntry(violations, content.entryId).length > 0
                        : false
                      return (
                        <GridCell
                          key={day}
                          day={day}
                          orderIndex={row.orderIndex}
                          content={content}
                          hasViolation={hasViolation}
                          onClick={content ? () => setSelectedEntryId(content.entryId) : undefined}
                        />
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Seances a placer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {!canEdit ? (
                <p className="text-xs text-muted-foreground">
                  Lecture seule : seuls les administrateurs et responsables EDT peuvent placer des seances.
                </p>
              ) : pendingSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune seance en attente pour cette selection.
                </p>
              ) : (
                pendingSessions.map((session) => {
                  const chipKey = `${session.groupId}:${session.index}`
                  const roomId = roomByChip[chipKey] ?? defaultRoomFor(session.groupId)
                  return (
                    <PendingSessionChip
                      key={chipKey}
                      session={session}
                      rooms={ctx.rooms}
                      roomId={roomId}
                      onRoomChange={(value) => setRoomByChip((m) => ({ ...m, [chipKey]: value }))}
                    />
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(selectedEntryId)} onOpenChange={(open) => !open && setSelectedEntryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEntry?.group.label}</DialogTitle>
            <DialogDescription>
              {selectedEntry && `${DAY_LABELS[selectedEntry.day_of_week]} - ${selectedEntry.slot_count}h`}
            </DialogDescription>
          </DialogHeader>
          {selectedEntryViolations.length > 0 ? (
            <div className="flex flex-col gap-2">
              {selectedEntryViolations.map((v, i) => (
                <div
                  key={i}
                  className={
                    v.severity === 'hard'
                      ? 'rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive'
                      : 'rounded-md border border-warning bg-warning/10 p-2 text-xs'
                  }
                >
                  {v.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune violation detectee pour cette seance.</p>
          )}
          {canEdit && (
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => selectedEntryId && handleDeleteEntry(selectedEntryId)}
              >
                Retirer cette seance
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  )
}
