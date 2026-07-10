import { classesOfGroup, entriesWithGroups, teachersOfGroup } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/**
 * Anti-monopole (souple) : un enseignant ne devrait pas couvrir, a lui seul,
 * toutes les classes d'un meme niveau pour une matiere donnee.
 */
export function antiMonopoly(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithGroups(ctx)

  // classes couvertes par (enseignant, matiere), agregees par niveau
  const coverage = new Map<string, { classIds: Set<string>; entryIds: string[] }>()

  for (const entry of entries) {
    const classIds = classesOfGroup(ctx, entry.teaching_group_id)
    const teacherIds = teachersOfGroup(ctx, entry.teaching_group_id)
    for (const teacherId of teacherIds) {
      const key = `${teacherId}::${entry.group.subject_id}`
      const acc = coverage.get(key) ?? { classIds: new Set(), entryIds: [] }
      classIds.forEach((c) => acc.classIds.add(c))
      acc.entryIds.push(entry.id)
      coverage.set(key, acc)
    }
  }

  const classesByLevel = new Map<string, Set<string>>()
  for (const cls of ctx.classes) {
    const set = classesByLevel.get(cls.level_id) ?? new Set()
    set.add(cls.id)
    classesByLevel.set(cls.level_id, set)
  }

  for (const [key, coverageInfo] of coverage) {
    const [teacherId, subjectId] = key.split('::')
    const teacher = ctx.teachers.find((t) => t.id === teacherId)
    const subject = ctx.subjects.find((s) => s.id === subjectId)
    if (!teacher || !subject) continue

    const coveredLevelIds = new Set(
      [...coverageInfo.classIds]
        .map((classId) => ctx.classes.find((c) => c.id === classId)?.level_id)
        .filter((id): id is string => Boolean(id)),
    )

    for (const levelId of coveredLevelIds) {
      const allClassesOfLevel = classesByLevel.get(levelId)
      if (!allClassesOfLevel || allClassesOfLevel.size <= 1) continue
      const coversAll = [...allClassesOfLevel].every((c) => coverageInfo.classIds.has(c))
      if (coversAll) {
        const level = ctx.levels.find((l) => l.id === levelId)
        violations.push({
          ruleCode: 'anti_monopoly',
          severity: 'soft',
          message: `${teacher.full_name} couvre a lui seul toutes les classes de ${level?.name ?? levelId} en ${subject.name}.`,
          entryIds: coverageInfo.entryIds,
        })
      }
    }
  }

  return violations
}
