import { entriesWithClasses, levelOfClass } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

/** Un enseignant ne doit pas intervenir sur plus de 3 niveaux differents par cycle (college / lycee separement). */
export function maxLevelsPerCycle(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithClasses(ctx)

  const levelsByTeacherCycle = new Map<string, Map<'college' | 'lycee', Set<string>>>()
  const entryIdsByTeacher = new Map<string, string[]>()

  for (const entry of entries) {
    entryIdsByTeacher.set(entry.teacher_id, [...(entryIdsByTeacher.get(entry.teacher_id) ?? []), entry.id])
    const cycles = levelsByTeacherCycle.get(entry.teacher_id) ?? new Map()
    for (const classId of entry.classIds) {
      const level = levelOfClass(ctx, classId)
      if (!level) continue
      const cycle = level.cycle as 'college' | 'lycee'
      const set = cycles.get(cycle) ?? new Set<string>()
      set.add(level.id)
      cycles.set(cycle, set)
    }
    levelsByTeacherCycle.set(entry.teacher_id, cycles)
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
