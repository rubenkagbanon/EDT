import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/**
 * Groupes lies (tandem PC/SVT, LV2 tronc commun) : doivent partager jour et
 * creneaux, avec des salles distinctes. Couvre les regles "tandem" et
 * "LV2 simultanee" du prompt source, qui reposent sur le meme mecanisme.
 */
export function pairedGroupSimultaneity(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const seen = new Set<string>()

  for (const group of ctx.teachingGroups) {
    if (!group.paired_group_id) continue
    const pairKey = [group.id, group.paired_group_id].sort().join('::')
    if (seen.has(pairKey)) continue
    seen.add(pairKey)

    const other = ctx.teachingGroups.find((g) => g.id === group.paired_group_id)
    if (!other) continue

    const groupEntries = ctx.entries.filter((e) => e.teaching_group_id === group.id)
    const otherEntries = ctx.entries.filter((e) => e.teaching_group_id === other.id)

    for (const a of groupEntries) {
      const match = otherEntries.find(
        (b) =>
          b.day_of_week === a.day_of_week &&
          b.start_slot_order === a.start_slot_order &&
          b.slot_count === a.slot_count,
      )
      if (!match) {
        violations.push({
          ruleCode: 'paired_group_simultaneity',
          severity: 'hard',
          message: `${group.label} et ${other.label} doivent etre places sur le meme creneau (tandem/LV2 simultanee).`,
          entryIds: [a.id],
        })
      } else if (match.room_id && a.room_id && match.room_id === a.room_id) {
        violations.push({
          ruleCode: 'paired_group_simultaneity',
          severity: 'hard',
          message: `${group.label} et ${other.label} doivent utiliser 2 salles distinctes.`,
          entryIds: [a.id, match.id],
        })
      }
    }
  }

  return violations
}
