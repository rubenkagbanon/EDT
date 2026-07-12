import type { Tables } from '@/types/database.types'

export type ScheduleContext = {
  timeSlots: Tables<'time_slots'>[]
  rooms: Tables<'rooms'>[]
  classes: Tables<'classes'>[]
  levels: Tables<'levels'>[]
  subjects: Tables<'subjects'>[]
  teachers: Tables<'teachers'>[]
  teacherSubjects: { teacher_id: string; subject_id: string }[]
  teacherLevels: { teacher_id: string; level_id: string }[]
  teacherUnavailability: Tables<'teacher_unavailability'>[]
  curriculumItems: Tables<'curriculum_items'>[]
  entries: Tables<'schedule_entries'>[]
  entryClasses: { entry_id: string; class_id: string }[]
  settings: Tables<'establishment_settings'> | null
}

export type ViolationSeverity = 'hard' | 'soft'

export type Violation = {
  ruleCode: string
  severity: ViolationSeverity
  message: string
  entryIds: string[]
}

/** Ordre d'arbitrage : priorite 1 (niveaux max) puis priorite 2 (anti-monopole). */
export const RULE_PRIORITY: Record<string, number> = {
  max_levels_per_cycle: 1,
  anti_monopoly: 2,
}

export function ruleSortOrder(ruleCode: string): number {
  return RULE_PRIORITY[ruleCode] ?? 99
}
