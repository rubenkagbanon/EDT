import { entriesWithGroups, teachersOfGroup } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/** Plafond de service : le volume horaire assigne a un enseignant ne doit jamais depasser son plafond. */
export function teacherCeiling(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithGroups(ctx)
  const hoursByTeacher = new Map<string, { total: number; entryIds: string[] }>()

  for (const entry of entries) {
    for (const teacherId of teachersOfGroup(ctx, entry.teaching_group_id)) {
      const acc = hoursByTeacher.get(teacherId) ?? { total: 0, entryIds: [] }
      acc.total += entry.slot_count
      acc.entryIds.push(entry.id)
      hoursByTeacher.set(teacherId, acc)
    }
  }

  for (const teacher of ctx.teachers) {
    const usage = hoursByTeacher.get(teacher.id)
    if (usage && usage.total > teacher.max_weekly_hours) {
      violations.push({
        ruleCode: 'teacher_ceiling',
        severity: 'hard',
        message: `${teacher.full_name} : ${usage.total}h affectees pour un plafond de ${teacher.max_weekly_hours}h.`,
        entryIds: usage.entryIds,
      })
    }
  }

  return violations
}
