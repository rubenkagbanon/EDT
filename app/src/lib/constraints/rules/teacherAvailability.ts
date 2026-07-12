import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/**
 * Indisponibilites des enseignants : si le reglage "respecter les
 * indisponibilites" est actif, aucune seance ne doit chevaucher un creneau
 * marque indisponible pour son enseignant.
 */
export function teacherAvailability(ctx: ScheduleContext): Violation[] {
  if (ctx.settings && !ctx.settings.respecter_indispos) return []

  const violations: Violation[] = []
  const unavailByTeacherDay = new Map<string, Set<number>>()
  for (const u of ctx.teacherUnavailability) {
    const key = `${u.teacher_id}:${u.day_of_week}`
    const set = unavailByTeacherDay.get(key) ?? new Set<number>()
    set.add(u.order_index)
    unavailByTeacherDay.set(key, set)
  }

  for (const entry of ctx.entries) {
    const key = `${entry.teacher_id}:${entry.day_of_week}`
    const unavailable = unavailByTeacherDay.get(key)
    if (!unavailable) continue

    let overlapsUnavailability = false
    for (let i = entry.start_slot_order; i < entry.start_slot_order + entry.slot_count; i++) {
      if (unavailable.has(i)) {
        overlapsUnavailability = true
        break
      }
    }
    if (overlapsUnavailability) {
      const teacher = ctx.teachers.find((t) => t.id === entry.teacher_id)
      violations.push({
        ruleCode: 'teacher_availability',
        severity: 'hard',
        message: `${teacher?.full_name ?? 'Cet enseignant'} est indisponible sur ce creneau.`,
        entryIds: [entry.id],
      })
    }
  }

  return violations
}
