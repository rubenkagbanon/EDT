import { courseSlotsForDay, entriesWithClasses } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/** Heures creuses : a placer en debut/fin de demi-journee, jamais encadrant une seance occupee. */
export function gapsPlacement(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithClasses(ctx)
  const days = [1, 2, 3, 4, 5, 6]

  for (const cls of ctx.classes) {
    for (const day of days) {
      const daySlots = courseSlotsForDay(ctx, day)
      if (daySlots.length === 0) continue

      const occupied = new Set<number>()
      for (const entry of entries) {
        if (entry.day_of_week !== day) continue
        if (!entry.classIds.includes(cls.id)) continue
        for (let i = entry.start_slot_order; i < entry.start_slot_order + entry.slot_count; i++) {
          occupied.add(i)
        }
      }
      if (occupied.size === 0) continue

      for (let i = 0; i < daySlots.length; i++) {
        const slot = daySlots[i]
        if (occupied.has(slot.order_index)) continue
        const hasBefore = daySlots.slice(0, i).some((s) => occupied.has(s.order_index))
        const hasAfter = daySlots.slice(i + 1).some((s) => occupied.has(s.order_index))
        if (hasBefore && hasAfter) {
          violations.push({
            ruleCode: 'gaps_sandwiched',
            severity: 'soft',
            message: `${cls.name} : heure creuse encadree par des cours le jour ${day} (creneau ${slot.order_index}).`,
            entryIds: [],
          })
        }
      }
    }
  }

  return violations
}
