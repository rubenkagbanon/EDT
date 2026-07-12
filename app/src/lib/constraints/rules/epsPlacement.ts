import { courseSlotsForDay } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/** EPS : bloc unique de 2 creneaux, sur un terrain, en tout debut ou toute fin de journee. */
export function epsPlacement(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []

  for (const entry of ctx.entries) {
    const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
    if (subject?.code !== 'EPS') continue

    const room = ctx.rooms.find((r) => r.id === entry.room_id)
    const daySlots = courseSlotsForDay(ctx, entry.day_of_week)
    const firstTwo = daySlots.slice(0, 2)
    const lastTwo = daySlots.slice(-2)

    const isAtStart =
      firstTwo.length === 2 &&
      entry.start_slot_order === firstTwo[0].order_index &&
      entry.slot_count === 2
    const isAtEnd =
      lastTwo.length === 2 &&
      entry.start_slot_order === lastTwo[0].order_index &&
      entry.slot_count === 2

    if (entry.slot_count !== 2 || room?.room_type !== 'terrain' || !(isAtStart || isAtEnd)) {
      violations.push({
        ruleCode: 'eps_placement',
        severity: 'hard',
        message: `L'EPS doit etre un bloc de 2h sur le terrain, en debut ou fin de journee.`,
        entryIds: [entry.id],
      })
    }
  }

  return violations
}
