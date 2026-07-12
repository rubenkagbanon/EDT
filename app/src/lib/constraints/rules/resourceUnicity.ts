import { entriesWithClasses, overlaps } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

function describeEntry(ctx: ScheduleContext, entry: { subject_id: string }, classIds: string[]) {
  const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
  const classNames = classIds.map((id) => ctx.classes.find((c) => c.id === id)?.name).filter(Boolean)
  return `${subject?.code ?? '?'} (${classNames.join('+') || '?'})`
}

/**
 * Unicite des ressources : une classe, un enseignant ou une salle ne peuvent
 * etre affectes qu'a un seul cours par creneau (sauf tandem/LV2, geres via
 * paired_entry_id, qui partagent volontairement la meme classe au meme
 * creneau dans 2 salles distinctes).
 */
export function resourceUnicity(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithClasses(ctx)

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]
      if (a.id === b.id) continue
      if (!overlaps(a.start_slot_order, a.slot_count, b.start_slot_order, b.slot_count, a.day_of_week, b.day_of_week)) {
        continue
      }

      const arePaired = a.paired_entry_id === b.id || b.paired_entry_id === a.id
      const labelA = describeEntry(ctx, a, a.classIds)
      const labelB = describeEntry(ctx, b, b.classIds)

      if (a.room_id && a.room_id === b.room_id) {
        violations.push({
          ruleCode: 'resource_unicity_room',
          severity: 'hard',
          message: `Salle en double reservation sur le meme creneau (${labelA} / ${labelB}).`,
          entryIds: [a.id, b.id],
        })
      }

      if (a.teacher_id === b.teacher_id) {
        const teacher = ctx.teachers.find((t) => t.id === a.teacher_id)
        violations.push({
          ruleCode: 'resource_unicity_teacher',
          severity: 'hard',
          message: `${teacher?.full_name ?? 'Un enseignant'} est affecte a 2 cours sur le meme creneau (${labelA} / ${labelB}).`,
          entryIds: [a.id, b.id],
        })
      }

      if (!arePaired && a.classIds.some((c) => b.classIds.includes(c))) {
        violations.push({
          ruleCode: 'resource_unicity_class',
          severity: 'hard',
          message: `Une classe a 2 cours sur le meme creneau (${labelA} / ${labelB}).`,
          entryIds: [a.id, b.id],
        })
      }
    }
  }

  return violations
}
