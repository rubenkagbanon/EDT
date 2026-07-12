import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/**
 * Tandem PC/SVT ou LV2 simultanee : 2 seances liees (`paired_entry_id`, deja
 * synchronise dans les 2 sens en base) doivent partager jour/creneau/duree,
 * avec des salles distinctes. Une paire correspond desormais directement a 2
 * entrees concretes -- plus besoin de chercher "l'entree correspondante"
 * parmi plusieurs, comme du temps des groupes pedagogiques.
 */
export function pairedEntrySimultaneity(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const seen = new Set<string>()
  const entriesById = new Map(ctx.entries.map((e) => [e.id, e]))

  for (const entry of ctx.entries) {
    if (!entry.paired_entry_id) continue
    const pairKey = [entry.id, entry.paired_entry_id].sort().join('::')
    if (seen.has(pairKey)) continue
    seen.add(pairKey)

    const other = entriesById.get(entry.paired_entry_id)
    if (!other) continue

    const sameSlot =
      entry.day_of_week === other.day_of_week &&
      entry.start_slot_order === other.start_slot_order &&
      entry.slot_count === other.slot_count

    if (!sameSlot) {
      violations.push({
        ruleCode: 'paired_entry_simultaneity',
        severity: 'hard',
        message: 'Les 2 seances liees (tandem/LV2) doivent etre placees sur le meme creneau.',
        entryIds: [entry.id, other.id],
      })
    } else if (entry.room_id && other.room_id && entry.room_id === other.room_id) {
      violations.push({
        ruleCode: 'paired_entry_simultaneity',
        severity: 'hard',
        message: 'Les 2 seances liees (tandem/LV2) doivent utiliser 2 salles distinctes.',
        entryIds: [entry.id, other.id],
      })
    }
  }

  return violations
}
