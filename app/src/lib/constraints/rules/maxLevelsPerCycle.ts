import { classesOfGroup, entriesWithGroups, levelOfClass, teachersOfGroup } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/** Un enseignant ne doit pas intervenir sur plus de 3 niveaux differents par cycle (college / lycee separement). */
export function maxLevelsPerCycle(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithGroups(ctx)

  const levelsByTeacherCycle = new Map<string, Map<'college' | 'lycee', Set<string>>>()
  const entryIdsByTeacher = new Map<string, string[]>()

  for (const entry of entries) {
    const classIds = classesOfGroup(ctx, entry.teaching_group_id)
    const teacherIds = teachersOfGroup(ctx, entry.teaching_group_id)
    for (const teacherId of teacherIds) {
      entryIdsByTeacher.set(teacherId, [...(entryIdsByTeacher.get(teacherId) ?? []), entry.id])
      const cycles = levelsByTeacherCycle.get(teacherId) ?? new Map()
      for (const classId of classIds) {
        const level = levelOfClass(ctx, classId)
        if (!level) continue
        const cycle = level.cycle as 'college' | 'lycee'
        const set = cycles.get(cycle) ?? new Set<string>()
        set.add(level.id)
        cycles.set(cycle, set)
      }
      levelsByTeacherCycle.set(teacherId, cycles)
    }
  }

  for (const [teacherId, cycles] of levelsByTeacherCycle) {
    const teacher = ctx.teachers.find((t) => t.id === teacherId)
    if (!teacher) continue
    for (const [cycle, levelIds] of cycles) {
      if (levelIds.size > 3) {
        violations.push({
          ruleCode: 'max_levels_per_cycle',
          severity: 'hard',
          message: `${teacher.full_name} intervient sur ${levelIds.size} niveaux differents en ${cycle === 'college' ? 'college' : 'lycee'} (max 3).`,
          entryIds: entryIdsByTeacher.get(teacherId) ?? [],
        })
      }
    }
  }

  return violations
}
