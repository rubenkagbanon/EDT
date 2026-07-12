import { courseSlotsForDay } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/**
 * Matieres lourdes le matin (souple) : si le reglage est actif, une matiere
 * marquee "lourde" placee dans la 2e moitie des creneaux "cours" du jour est
 * signalee (meme heuristique que le repo de reference : matin_max = n_slots // 2).
 */
export function heavySubjectsMorning(ctx: ScheduleContext): Violation[] {
  if (!ctx.settings?.lourdes_matin) return []
  const heavySubjectIds = new Set(ctx.settings.matieres_lourdes)
  if (heavySubjectIds.size === 0) return []

  const violations: Violation[] = []

  for (const entry of ctx.entries) {
    if (!heavySubjectIds.has(entry.subject_id)) continue
    const daySlots = courseSlotsForDay(ctx, entry.day_of_week)
    const matinMax = Math.floor(daySlots.length / 2)
    const position = daySlots.findIndex((s) => s.order_index === entry.start_slot_order)
    if (position === -1 || position < matinMax) continue

    const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
    violations.push({
      ruleCode: 'heavy_subject_afternoon',
      severity: 'soft',
      message: `${subject?.name ?? 'Cette matiere'} (lourde) est placee l'apres-midi plutot que le matin.`,
      entryIds: [entry.id],
    })
  }

  return violations
}
