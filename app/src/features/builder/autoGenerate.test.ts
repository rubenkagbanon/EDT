import { describe, expect, it } from 'vitest'

import { autoGenerateSchedule } from '@/features/builder/autoGenerate'
import { runAllRules } from '@/lib/constraints'
import type { ScheduleContext } from '@/lib/constraints/types'
import type { Tables } from '@/types/database.types'

const EST = 'est-1'

const rooms: Tables<'rooms'>[] = [
  { id: 'S1', establishment_id: EST, name: 'S1', room_type: 'salle_principale', capacity: 30, priority_note: null },
  { id: 'TERRAIN', establishment_id: EST, name: 'Terrain', room_type: 'terrain', capacity: 60, priority_note: null },
]

const levels: Tables<'levels'>[] = [{ id: 'L6', establishment_id: EST, name: '6eme', cycle: 'college', order_index: 1 }]

const classes: Tables<'classes'>[] = [
  { id: 'C1', establishment_id: EST, level_id: 'L6', name: '6eme 1', headcount: 30 },
]

const subjects: Tables<'subjects'>[] = [
  { id: 'MATH', establishment_id: EST, code: 'MATH', name: 'Mathematiques', subject_group: 'sciences' },
  { id: 'EPS', establishment_id: EST, code: 'EPS', name: 'EPS', subject_group: 'autre' },
]

const teachers: Tables<'teachers'>[] = [
  { id: 'T1', establishment_id: EST, full_name: 'Prof 1', max_weekly_hours: 20 },
  { id: 'T2', establishment_id: EST, full_name: 'Prof 2', max_weekly_hours: 20 },
]

// 2 jours, chacun : cours 1,2 / recreation 3 / cours 4,5.
function buildTimeSlots(): Tables<'time_slots'>[] {
  const slots: Tables<'time_slots'>[] = []
  for (const day of [1, 2]) {
    slots.push(
      { id: `${day}-1`, establishment_id: EST, day_of_week: day, order_index: 1, kind: 'cours', start_time: '08:00:00', end_time: '09:00:00' },
      { id: `${day}-2`, establishment_id: EST, day_of_week: day, order_index: 2, kind: 'cours', start_time: '09:00:00', end_time: '10:00:00' },
      { id: `${day}-3`, establishment_id: EST, day_of_week: day, order_index: 3, kind: 'recreation', start_time: '10:00:00', end_time: '10:15:00' },
      { id: `${day}-4`, establishment_id: EST, day_of_week: day, order_index: 4, kind: 'cours', start_time: '10:15:00', end_time: '11:15:00' },
      { id: `${day}-5`, establishment_id: EST, day_of_week: day, order_index: 5, kind: 'cours', start_time: '11:15:00', end_time: '12:15:00' },
    )
  }
  return slots
}
const timeSlots = buildTimeSlots()

function entry(
  id: string,
  subjectId: string,
  teacherId: string,
  day: number,
  start: number,
  count: number,
  roomId: string | null,
): Tables<'schedule_entries'> {
  return {
    id,
    establishment_id: EST,
    academic_year_id: 'ay-1',
    subject_id: subjectId,
    teacher_id: teacherId,
    day_of_week: day,
    start_slot_order: start,
    slot_count: count,
    room_id: roomId,
    paired_entry_id: null,
  }
}

function baseContext(overrides: Partial<ScheduleContext>): ScheduleContext {
  return {
    timeSlots,
    rooms,
    classes,
    levels,
    subjects,
    teachers,
    teacherSubjects: [{ teacher_id: 'T1', subject_id: 'MATH' }, { teacher_id: 'T2', subject_id: 'EPS' }],
    teacherLevels: [{ teacher_id: 'T1', level_id: 'L6' }, { teacher_id: 'T2', level_id: 'L6' }],
    teacherUnavailability: [],
    curriculumItems: [],
    entries: [],
    entryClasses: [],
    settings: null,
    ...overrides,
  }
}

function withFakeIds(inserts: ReturnType<typeof autoGenerateSchedule>['newEntries']): Tables<'schedule_entries'>[] {
  return inserts.map((e) => e as Tables<'schedule_entries'>)
}

describe('autoGenerateSchedule', () => {
  it('places a pending session for a class with a qualified teacher', () => {
    const ctx = baseContext({
      curriculumItems: [{ id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 1, session_pattern: null }],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1)
    expect(result.unplacedCount).toBe(0)
    expect(result.newEntries).toHaveLength(1)
    expect(result.newEntries[0].teacher_id).toBe('T1')
    expect(result.newEntryClasses).toEqual([{ entry_id: result.newEntries[0].id, class_id: 'C1' }])

    const newEntries = withFakeIds(result.newEntries)
    const fullCtx: ScheduleContext = {
      ...ctx,
      entries: [...ctx.entries, ...newEntries],
      entryClasses: [...ctx.entryClasses, ...result.newEntryClasses],
    }
    const hardViolations = runAllRules(fullCtx).filter((v) => v.severity === 'hard')
    const newIds = new Set(newEntries.map((e) => e.id))
    expect(hardViolations.some((v) => v.entryIds.some((id) => newIds.has(id)))).toBe(false)
  })

  it('places EPS as a 2-slot block on the terrain in a valid window', () => {
    const ctx = baseContext({
      curriculumItems: [{ id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'EPS', weekly_hours: 2, session_pattern: null }],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1)
    expect(result.newEntries).toHaveLength(1)
    const placed = result.newEntries[0]
    expect(placed.slot_count).toBe(2)
    expect(placed.room_id).toBe('TERRAIN')
    expect(placed.teacher_id).toBe('T2')
    expect([1, 4]).toContain(placed.start_slot_order)
  })

  it('reports unplaced instead of throwing when no teacher is qualified', () => {
    const ctx = baseContext({
      teacherSubjects: [], // personne n'est habilite en MATH
      curriculumItems: [{ id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 1, session_pattern: null }],
    })

    expect(() => autoGenerateSchedule(ctx, 'ay-1')).not.toThrow()
    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.unplacedCount).toBe(1)
    expect(result.newEntries).toHaveLength(0)
  })

  it('never touches or duplicates an already-placed entry', () => {
    const existing = entry('e1', 'MATH', 'T1', 1, 1, 1, 'S1')
    const ctx = baseContext({
      curriculumItems: [{ id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 2, session_pattern: null }],
      entries: [existing],
      entryClasses: [{ entry_id: 'e1', class_id: 'C1' }],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1) // 2h besoin - 1h deja placee = 1h restante
    expect(result.newEntries).toHaveLength(1)
    const placed = result.newEntries[0]
    expect(placed.day_of_week === existing.day_of_week && placed.start_slot_order === existing.start_slot_order).toBe(
      false,
    )
  })

  it('respects a teacher unavailability and finds another slot', () => {
    const ctx = baseContext({
      curriculumItems: [{ id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 1, session_pattern: null }],
      teacherUnavailability: [
        { id: 'u1', establishment_id: EST, teacher_id: 'T1', day_of_week: 1, order_index: 1 },
      ],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1)
    const placed = result.newEntries[0]
    expect(placed.day_of_week === 1 && placed.start_slot_order === 1).toBe(false)
  })

  it('returns unplacedCount > 0 without throwing when over-constrained', () => {
    // 8 creneaux "cours" dispo (4/jour x 2 jours) pour 10h de besoin.
    const ctx = baseContext({
      curriculumItems: [{ id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 10, session_pattern: null }],
    })

    expect(() => autoGenerateSchedule(ctx, 'ay-1')).not.toThrow()
    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.unplacedCount).toBeGreaterThan(0)
  })
})
