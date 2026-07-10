import type { ScheduleContext } from '@/lib/constraints/types'
import type { Tables } from '@/types/database.types'

export type EntryWithGroup = Tables<'schedule_entries'> & {
  group: Tables<'teaching_groups'>
}

export function entriesWithGroups(ctx: ScheduleContext): EntryWithGroup[] {
  const groupsById = new Map(ctx.teachingGroups.map((g) => [g.id, g]))
  return ctx.entries.flatMap((entry) => {
    const group = groupsById.get(entry.teaching_group_id)
    return group ? [{ ...entry, group }] : []
  })
}

export function classesOfGroup(ctx: ScheduleContext, groupId: string): string[] {
  return ctx.groupClasses.filter((gc) => gc.group_id === groupId).map((gc) => gc.class_id)
}

export function teachersOfGroup(ctx: ScheduleContext, groupId: string): string[] {
  return ctx.groupTeachers.filter((gt) => gt.group_id === groupId).map((gt) => gt.teacher_id)
}

export function overlaps(
  aStart: number,
  aCount: number,
  bStart: number,
  bCount: number,
  aDay: number,
  bDay: number,
): boolean {
  if (aDay !== bDay) return false
  return aStart < bStart + bCount && bStart < aStart + aCount
}

/** Creneaux "cours" d'un jour donne, tries par ordre. */
export function courseSlotsForDay(ctx: ScheduleContext, dayOfWeek: number) {
  return ctx.timeSlots
    .filter((s) => s.day_of_week === dayOfWeek && s.kind === 'cours')
    .sort((a, b) => a.order_index - b.order_index)
}

export function levelOfClass(ctx: ScheduleContext, classId: string) {
  const cls = ctx.classes.find((c) => c.id === classId)
  if (!cls) return undefined
  return ctx.levels.find((l) => l.id === cls.level_id)
}
