import { classesOfGroup, entriesWithGroups, overlaps, teachersOfGroup } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/**
 * Unicite des ressources : une classe, un enseignant ou une salle ne peuvent
 * etre affectes qu'a un seul cours par creneau (sauf tandem/LV2, geres via
 * paired_group_id, qui partagent volontairement la meme classe au meme
 * creneau dans 2 salles distinctes).
 */
export function resourceUnicity(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithGroups(ctx)

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]
      if (a.teaching_group_id === b.teaching_group_id) continue
      if (!overlaps(a.start_slot_order, a.slot_count, b.start_slot_order, b.slot_count, a.day_of_week, b.day_of_week)) {
        continue
      }

      const arePaired = a.group.paired_group_id === b.group.id || b.group.paired_group_id === a.group.id

      if (a.room_id && a.room_id === b.room_id) {
        violations.push({
          ruleCode: 'resource_unicity_room',
          severity: 'hard',
          message: `Salle en double reservation sur le meme creneau (${a.group.label} / ${b.group.label}).`,
          entryIds: [a.id, b.id],
        })
      }

      const aTeachers = teachersOfGroup(ctx, a.teaching_group_id)
      const bTeachers = teachersOfGroup(ctx, b.teaching_group_id)
      if (aTeachers.some((t) => bTeachers.includes(t))) {
        violations.push({
          ruleCode: 'resource_unicity_teacher',
          severity: 'hard',
          message: `Un enseignant est affecte a 2 cours sur le meme creneau (${a.group.label} / ${b.group.label}).`,
          entryIds: [a.id, b.id],
        })
      }

      if (!arePaired) {
        const aClasses = classesOfGroup(ctx, a.teaching_group_id)
        const bClasses = classesOfGroup(ctx, b.teaching_group_id)
        if (aClasses.some((c) => bClasses.includes(c))) {
          violations.push({
            ruleCode: 'resource_unicity_class',
            severity: 'hard',
            message: `Une classe a 2 cours sur le meme creneau (${a.group.label} / ${b.group.label}).`,
            entryIds: [a.id, b.id],
          })
        }
      }
    }
  }

  return violations
}
