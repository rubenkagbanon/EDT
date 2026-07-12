import { chunkRemainingHours, qualifiedTeacherIds, remainingHoursForClassSubject } from '@/lib/constraints/helpers'
import type { ScheduleContext } from '@/lib/constraints/types'

export const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

export type GridRow = {
  orderIndex: number
  label: string
}

export function buildGridDays(ctx: ScheduleContext): number[] {
  return [...new Set(ctx.timeSlots.map((s) => s.day_of_week))].sort((a, b) => a - b)
}

export function buildGridRows(ctx: ScheduleContext): GridRow[] {
  const orderIndexes = [...new Set(ctx.timeSlots.map((s) => s.order_index))].sort((a, b) => a - b)
  return orderIndexes.map((orderIndex) => {
    const sample = ctx.timeSlots.find((s) => s.order_index === orderIndex)
    return {
      orderIndex,
      label: sample ? `${sample.start_time.slice(0, 5)}-${sample.end_time.slice(0, 5)}` : String(orderIndex),
    }
  })
}

export function slotAt(ctx: ScheduleContext, day: number, orderIndex: number) {
  return ctx.timeSlots.find((s) => s.day_of_week === day && s.order_index === orderIndex)
}

export type ViewMode = 'class' | 'teacher' | 'room'

export type CellContent = {
  entryId: string
  label: string
  subjectCode: string
}

function classesByEntryMap(ctx: ScheduleContext): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const ec of ctx.entryClasses) {
    map.set(ec.entry_id, [...(map.get(ec.entry_id) ?? []), ec.class_id])
  }
  return map
}

/** Renvoie l'entree occupant (day, orderIndex) pour l'entite selectionnee, selon la vue. */
export function cellContentFor(
  ctx: ScheduleContext,
  view: ViewMode,
  entityId: string,
  day: number,
  orderIndex: number,
): CellContent | undefined {
  const classesByEntry = classesByEntryMap(ctx)
  const entry = ctx.entries.find((e) => {
    if (e.day_of_week !== day) return false
    if (orderIndex < e.start_slot_order || orderIndex >= e.start_slot_order + e.slot_count) return false
    if (view === 'class') return (classesByEntry.get(e.id) ?? []).includes(entityId)
    if (view === 'teacher') return e.teacher_id === entityId
    return e.room_id === entityId
  })
  if (!entry) return undefined

  const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
  const subjectCode = subject?.code ?? '?'
  const classNames = (classesByEntry.get(entry.id) ?? [])
    .map((id) => ctx.classes.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join('+')

  let label: string
  if (view === 'class') {
    const room = ctx.rooms.find((r) => r.id === entry.room_id)
    label = `${subjectCode} (${room?.name ?? '?'})`
  } else if (view === 'teacher') {
    const room = ctx.rooms.find((r) => r.id === entry.room_id)
    label = `${classNames} (${room?.name ?? '?'})`
  } else {
    label = `${classNames} (${subjectCode})`
  }

  return { entryId: entry.id, label, subjectCode }
}

export type PendingNeed = {
  classId: string
  className: string
  subjectId: string
  subjectCode: string
  remainingHours: number
  qualifiedTeacherIds: string[]
  /** Duree (en creneaux) de la prochaine seance, selon la repartition configuree (ex. 2+1+1+1). */
  nextSessionLength: number
}

/**
 * Besoins restants (volume horaire du niveau non encore couvert) pour un
 * ensemble de classes -- une ligne par (classe, matiere). Sans notion de
 * groupe pedagogique, le decoupage en seances et le choix du professeur se
 * font desormais au moment du depot (voir PendingSessionChip).
 */
export function pendingNeedsForClasses(ctx: ScheduleContext, classIds: string[]): PendingNeed[] {
  const needs: PendingNeed[] = []
  for (const classId of classIds) {
    const cls = ctx.classes.find((c) => c.id === classId)
    if (!cls) continue
    const items = ctx.curriculumItems.filter((c) => c.level_id === cls.level_id)
    for (const item of items) {
      const remaining = remainingHoursForClassSubject(ctx, classId, item.subject_id)
      if (remaining <= 0) continue
      const subject = ctx.subjects.find((s) => s.id === item.subject_id)
      const subjectCode = subject?.code ?? '?'
      const chunks = chunkRemainingHours(ctx, classId, item.subject_id, subjectCode, remaining)
      needs.push({
        classId,
        className: cls.name,
        subjectId: item.subject_id,
        subjectCode,
        remainingHours: remaining,
        qualifiedTeacherIds: qualifiedTeacherIds(ctx, item.subject_id, cls.level_id),
        nextSessionLength: chunks[0] ?? Math.min(2, remaining),
      })
    }
  }
  return needs
}
