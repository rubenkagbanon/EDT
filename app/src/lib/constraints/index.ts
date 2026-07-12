import { resourceUnicity } from '@/lib/constraints/rules/resourceUnicity'
import { teacherCeiling } from '@/lib/constraints/rules/teacherCeiling'
import { maxLevelsPerCycle } from '@/lib/constraints/rules/maxLevelsPerCycle'
import { antiMonopoly } from '@/lib/constraints/rules/antiMonopoly'
import { sequencing } from '@/lib/constraints/rules/sequencing'
import { epsPlacement } from '@/lib/constraints/rules/epsPlacement'
import { gapsPlacement } from '@/lib/constraints/rules/gapsPlacement'
import { pairedEntrySimultaneity } from '@/lib/constraints/rules/pairedEntrySimultaneity'
import { teacherAvailability } from '@/lib/constraints/rules/teacherAvailability'
import { heavySubjectsMorning } from '@/lib/constraints/rules/heavySubjectsMorning'
import { ruleSortOrder, type ScheduleContext, type Violation } from '@/lib/constraints/types'

const RULES: Array<(ctx: ScheduleContext) => Violation[]> = [
  resourceUnicity,
  teacherCeiling,
  maxLevelsPerCycle,
  antiMonopoly,
  sequencing,
  epsPlacement,
  gapsPlacement,
  pairedEntrySimultaneity,
  teacherAvailability,
  heavySubjectsMorning,
]

export function runAllRules(ctx: ScheduleContext): Violation[] {
  const violations = RULES.flatMap((rule) => rule(ctx))
  return violations.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'hard' ? -1 : 1
    return ruleSortOrder(a.ruleCode) - ruleSortOrder(b.ruleCode)
  })
}

export function violationsForEntry(violations: Violation[], entryId: string): Violation[] {
  return violations.filter((v) => v.entryIds.includes(entryId))
}

export * from '@/lib/constraints/types'
