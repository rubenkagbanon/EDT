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
import { useInsertEntryClassesMany, useLinkEntryClasses } from '@/features/setup/scheduleEntryClasses'
import { useViolations } from '@/features/validation/useValidationSummary'
import { violationsForEntry } from '@/lib/constraints'
import {
  DAY_LABELS,
  buildGridDays,
  buildGridRows,
  cellContentFor,
  pendingNeedsForClasses,
  slotAt,
  type PendingNeed,
  type ViewMode,
} from '@/features/builder/gridUtils'
import { autoGenerateSchedule } from '@/features/builder/autoGenerate'
import { GridCell } from '@/features/builder/GridCell'
import { PendingSessionChip, type PendingDragData } from '@/features/builder/PendingSessionChip'
import type { Tables } from '@/types/database.types'

type ChipState = { length: number; teacherId: string; roomId: string }

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
  const linkEntryClasses = useLinkEntryClasses(establishmentId!)
  const insertEntryClassesMany = useInsertEntryClassesMany(establishmentId!)

  const [view, setView] = React.useState<ViewMode>('class')
  const [entityId, setEntityId] = React.useState<string>('')
  const [chipState, setChipState] = React.useState<Record<string, ChipState>>({})
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

  // En vue "classe", on ne montre les besoins que pour la classe selectionnee ;
  // en vue prof/salle (qui ne filtrent plus naturellement les besoins, sans
  // groupe pedagogique), on montre tous les besoins de l'etablissement.
  const pendingClassIds = view === 'class' && entityId ? [entityId] : ctx.classes.map((c) => c.id)
  const pendingNeeds = pendingNeedsForClasses(ctx, pendingClassIds)

  function defaultRoomFor(subjectCode: string) {
    if (subjectCode === 'EPS') {
      return ctx!.rooms.find((r) => r.room_type === 'terrain')?.id ?? ctx!.rooms[0]?.id ?? ''
    }
    return ctx!.rooms.find((r) => r.room_type === 'salle_principale')?.id ?? ctx!.rooms[0]?.id ?? ''
  }

  function chipKeyFor(need: PendingNeed) {
    return `${need.classId}:${need.subjectId}`
  }

  function getChipState(need: PendingNeed): ChipState {
    return (
      chipState[chipKeyFor(need)] ?? {
        length: need.nextSessionLength,
        teacherId: need.qualifiedTeacherIds[0] ?? '',
        roomId: defaultRoomFor(need.subjectCode),
      }
    )
  }

  function updateChipState(need: PendingNeed, patch: Partial<ChipState>) {
    const key = chipKeyFor(need)
    setChipState((s) => ({ ...s, [key]: { ...getChipState(need), ...patch } }))
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
      const primary = await createMutation.mutateAsync({
        establishment_id: establishmentId,
        academic_year_id: activeYear.id,
        subject_id: data.subjectId,
        teacher_id: data.teacherId,
        day_of_week: overData.day,
        start_slot_order: overData.orderIndex,
        slot_count: data.length,
        room_id: data.roomId,
      } as never)

      let secondary: Tables<'schedule_entries'> | undefined
      if (data.pair) {
        secondary = await createMutation.mutateAsync({
          establishment_id: establishmentId,
          academic_year_id: activeYear.id,
          subject_id: data.pair.subjectId,
          teacher_id: data.pair.teacherId,
          day_of_week: overData.day,
          start_slot_order: overData.orderIndex,
          slot_count: data.length,
          room_id: data.pair.roomId,
          paired_entry_id: primary.id,
        } as never)
      }

      await linkEntryClasses.mutateAsync({
        entryId: primary.id,
        classIds: [data.classId, ...data.extraClassIds],
      })
      if (secondary) {
        await linkEntryClasses.mutateAsync({ entryId: secondary.id, classIds: [data.classId] })
      }

      toast.success(data.pair ? 'Seances (tandem) placees.' : 'Seance placee.')
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
        if (result.newEntryClasses.length > 0) {
          await insertEntryClassesMany.mutateAsync(result.newEntryClasses)
        }
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

  const selectedEntry = selectedEntryId ? ctx.entries.find((e) => e.id === selectedEntryId) : undefined
  const selectedEntryClassNames = selectedEntry
    ? ctx.entryClasses
        .filter((ec) => ec.entry_id === selectedEntry.id)
        .map((ec) => ctx.classes.find((c) => c.id === ec.class_id)?.name)
        .filter(Boolean)
        .join('+')
    : ''
  const selectedEntrySubject = selectedEntry
    ? ctx.subjects.find((s) => s.id === selectedEntry.subject_id)
    : undefined
  const selectedEntryTeacher = selectedEntry
    ? ctx.teachers.find((t) => t.id === selectedEntry.teacher_id)
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
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
              ) : pendingNeeds.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune seance en attente pour cette selection.
                </p>
              ) : (
                pendingNeeds.map((need) => {
                  const state = getChipState(need)
                  return (
                    <PendingSessionChip
                      key={chipKeyFor(need)}
                      ctx={ctx}
                      need={need}
                      otherNeeds={pendingNeeds.filter((n) => n.classId === need.classId)}
                      length={state.length}
                      onLengthChange={(length) => updateChipState(need, { length })}
                      teacherId={state.teacherId}
                      onTeacherChange={(teacherId) => updateChipState(need, { teacherId })}
                      roomId={state.roomId}
                      onRoomChange={(roomId) => updateChipState(need, { roomId })}
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
            <DialogTitle>
              {selectedEntrySubject?.name} - {selectedEntryClassNames}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry &&
                `${DAY_LABELS[selectedEntry.day_of_week]} - ${selectedEntry.slot_count}h - ${selectedEntryTeacher?.full_name ?? '?'}`}
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
