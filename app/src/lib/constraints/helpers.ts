import type { ScheduleContext } from '@/lib/constraints/types'
import type { Tables } from '@/types/database.types'

export type EntryWithClasses = Tables<'schedule_entries'> & { classIds: string[] }

export function entriesWithClasses(ctx: ScheduleContext): EntryWithClasses[] {
  const classesByEntry = new Map<string, string[]>()
  for (const ec of ctx.entryClasses) {
    const list = classesByEntry.get(ec.entry_id) ?? []
    list.push(ec.class_id)
    classesByEntry.set(ec.entry_id, list)
  }
  return ctx.entries.map((entry) => ({ ...entry, classIds: classesByEntry.get(entry.id) ?? [] }))
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

/**
 * Heures encore a placer pour une classe+matiere : volume reglementaire du
 * niveau (curriculum_items) moins la somme des `slot_count` deja places pour
 * cette classe et cette matiere.
 */
export function remainingHoursForClassSubject(
  ctx: ScheduleContext,
  classId: string,
  subjectId: string,
): number {
  const level = levelOfClass(ctx, classId)
  if (!level) return 0
  const item = ctx.curriculumItems.find((c) => c.level_id === level.id && c.subject_id === subjectId)
  const target = item?.weekly_hours ?? 0

  const placed = entriesWithClasses(ctx)
    .filter((e) => e.subject_id === subjectId && e.classIds.includes(classId))
    .reduce((sum, e) => sum + e.slot_count, 0)

  return Math.max(0, target - placed)
}

/** Enseignants habilites (matiere + niveau) pour un besoin donne. */
export function qualifiedTeacherIds(ctx: ScheduleContext, subjectId: string, levelId: string): string[] {
  const bySubject = new Set(
    ctx.teacherSubjects.filter((ts) => ts.subject_id === subjectId).map((ts) => ts.teacher_id),
  )
  const byLevel = new Set(
    ctx.teacherLevels.filter((tl) => tl.level_id === levelId).map((tl) => tl.teacher_id),
  )
  return [...bySubject].filter((id) => byLevel.has(id))
}

/** Nombre de seances deja placees pour une classe+matiere (tronc commun compte une seule fois par classe). */
export function placedSessionCountForClassSubject(
  ctx: ScheduleContext,
  classId: string,
  subjectId: string,
): number {
  return entriesWithClasses(ctx).filter((e) => e.subject_id === subjectId && e.classIds.includes(classId)).length
}

/**
 * Decoupe les heures restantes d'une classe+matiere en seances. Suit la
 * repartition configuree sur `curriculum_items.session_pattern` (ex.
 * `[2,1,1,1]`) si elle existe -- en reprenant a partir du nombre de seances
 * deja placees -- sinon des blocs generiques de 2h (EPS : blocs de 2h
 * uniquement).
 */
export function chunkRemainingHours(
  ctx: ScheduleContext,
  classId: string,
  subjectId: string,
  subjectCode: string,
  remaining: number,
): number[] {
  const level = levelOfClass(ctx, classId)
  const item = level
    ? ctx.curriculumItems.find((c) => c.level_id === level.id && c.subject_id === subjectId)
    : undefined
  const pattern = item?.session_pattern

  const chunks: number[] = []
  let r = remaining

  if (pattern && pattern.length > 0) {
    let i = placedSessionCountForClassSubject(ctx, classId, subjectId)
    while (r > 0) {
      const block = Math.min(pattern[Math.min(i, pattern.length - 1)], r)
      chunks.push(block)
      r -= block
      i += 1
    }
    return chunks
  }

  if (subjectCode === 'EPS') {
    while (r >= 2) {
      chunks.push(2)
      r -= 2
    }
    return chunks
  }
  while (r > 0) {
    const block = Math.min(2, r)
    chunks.push(block)
    r -= block
  }
  return chunks
}
