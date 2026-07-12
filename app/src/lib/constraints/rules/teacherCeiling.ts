import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/** Plafond de service : le volume horaire assigne a un enseignant ne doit jamais depasser son plafond. */
export function teacherCeiling(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const hoursByTeacher = new Map<string, { total: number; entryIds: string[] }>()

  for (const entry of ctx.entries) {
    const acc = hoursByTeacher.get(entry.teacher_id) ?? { total: 0, entryIds: [] }
    acc.total += entry.slot_count
    acc.entryIds.push(entry.id)
    hoursByTeacher.set(entry.teacher_id, acc)
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
