import {
  classesOfGroup,
  entriesWithGroups,
  remainingSessionsForGroup,
  teachersOfGroup,
} from '@/lib/constraints/helpers'
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

/** Renvoie l'entree occupant (day, orderIndex) pour l'entite selectionnee, selon la vue. */
export function cellContentFor(
  ctx: ScheduleContext,
  view: ViewMode,
  entityId: string,
  day: number,
  orderIndex: number,
): CellContent | undefined {
  const entries = entriesWithGroups(ctx)
  const entry = entries.find((e) => {
    if (e.day_of_week !== day) return false
    if (orderIndex < e.start_slot_order || orderIndex >= e.start_slot_order + e.slot_count) return false
    if (view === 'class') return classesOfGroup(ctx, e.teaching_group_id).includes(entityId)
    if (view === 'teacher') return teachersOfGroup(ctx, e.teaching_group_id).includes(entityId)
    return e.room_id === entityId
  })
  if (!entry) return undefined

  const subject = ctx.subjects.find((s) => s.id === entry.group.subject_id)
  const subjectCode = subject?.code ?? '?'

  let label: string
  if (view === 'class') {
    const room = ctx.rooms.find((r) => r.id === entry.room_id)
    label = `${subjectCode} (${room?.name ?? '?'})`
  } else if (view === 'teacher') {
    const classNames = classesOfGroup(ctx, entry.teaching_group_id)
      .map((id) => ctx.classes.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join('+')
    const room = ctx.rooms.find((r) => r.id === entry.room_id)
    label = `${classNames} (${room?.name ?? '?'})`
  } else {
    const classNames = classesOfGroup(ctx, entry.teaching_group_id)
      .map((id) => ctx.classes.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join('+')
    label = `${classNames} (${subjectCode})`
  }

  return { entryId: entry.id, label, subjectCode }
}

export type PendingSession = {
  groupId: string
  groupLabel: string
  subjectCode: string
  length: number
  index: number
}

export function pendingSessionsForGroups(ctx: ScheduleContext, groupIds: string[]): PendingSession[] {
  const pending: PendingSession[] = []
  for (const groupId of groupIds) {
    const group = ctx.teachingGroups.find((g) => g.id === groupId)
    if (!group) continue
    const remaining = remainingSessionsForGroup(ctx, groupId)
    const subject = ctx.subjects.find((s) => s.id === group.subject_id)
    remaining.forEach((length, i) => {
      pending.push({
        groupId,
        groupLabel: group.label,
        subjectCode: subject?.code ?? '?',
        length,
        index: i,
      })
    })
  }
  return pending
}
