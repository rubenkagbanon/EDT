import { describe, expect, it } from 'vitest'

import { autoGenerateSchedule } from '@/features/builder/autoGenerate'
import { runAllRules } from '@/lib/constraints'
import type { ScheduleContext } from '@/lib/constraints/types'
import type { Tables } from '@/types/database.types'

const EST = 'est-1'

const rooms: Tables<'rooms'>[] = [
  { id: 'S1', establishment_id: EST, name: 'S1', room_type: 'salle_principale', capacity: 30, priority_note: null },
  { id: 'S2', establishment_id: EST, name: 'S2', room_type: 'salle_principale', capacity: 30, priority_note: null },
  { id: 'L1', establishment_id: EST, name: 'L1', room_type: 'laboratoire', capacity: 15, priority_note: null },
  { id: 'L2', establishment_id: EST, name: 'L2', room_type: 'laboratoire', capacity: 15, priority_note: null },
  { id: 'TERRAIN', establishment_id: EST, name: 'Terrain', room_type: 'terrain', capacity: 60, priority_note: null },
]

const levels: Tables<'levels'>[] = [
  { id: 'L6', establishment_id: EST, name: '6eme', cycle: 'college', order_index: 1 },
]

const classes: Tables<'classes'>[] = [
  { id: 'C1', establishment_id: EST, level_id: 'L6', name: '6eme 1', headcount: 30 },
]

const subjects: Tables<'subjects'>[] = [
  { id: 'MATH', establishment_id: EST, code: 'MATH', name: 'Mathematiques', subject_group: 'sciences' },
  { id: 'PC', establishment_id: EST, code: 'PC', name: 'Physique-Chimie', subject_group: 'sciences' },
  { id: 'SVT', establishment_id: EST, code: 'SVT', name: 'SVT', subject_group: 'sciences' },
  { id: 'EPS', establishment_id: EST, code: 'EPS', name: 'EPS', subject_group: 'autre' },
]

const teachers: Tables<'teachers'>[] = [
  { id: 'T1', establishment_id: EST, full_name: 'Prof 1', max_weekly_hours: 20 },
  { id: 'T2', establishment_id: EST, full_name: 'Prof 2', max_weekly_hours: 20 },
  { id: 'T3', establishment_id: EST, full_name: 'Prof 3', max_weekly_hours: 20 },
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

function group(
  id: string,
  subjectId: string,
  label: string,
  sessionSlotLengths: number[],
  pairedGroupId: string | null = null,
): Tables<'teaching_groups'> {
  return {
    id,
    establishment_id: EST,
    subject_id: subjectId,
    label,
    session_slot_lengths: sessionSlotLengths,
    paired_group_id: pairedGroupId,
  }
}

function entry(
  id: string,
  groupId: string,
  day: number,
  start: number,
  count: number,
  roomId: string | null,
): Tables<'schedule_entries'> {
  return {
    id,
    establishment_id: EST,
    academic_year_id: 'ay-1',
    teaching_group_id: groupId,
    day_of_week: day,
    start_slot_order: start,
    slot_count: count,
    room_id: roomId,
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
    teachingGroups: [],
    groupClasses: [],
    groupTeachers: [],
    entries: [],
    ...overrides,
  }
}

/** Attribue des ids factices aux entries generees pour pouvoir les repasser dans runAllRules. */
function withFakeIds(inserts: ReturnType<typeof autoGenerateSchedule>['newEntries']): Tables<'schedule_entries'>[] {
  return inserts.map((e, i) => ({ ...e, id: `new-${i}` }) as Tables<'schedule_entries'>)
}

describe('autoGenerateSchedule', () => {
  it('places a pending solo session without introducing a hard violation', () => {
    const g = group('g1', 'MATH', 'Maths C1', [1])
    const ctx = baseContext({
      teachingGroups: [g],
      groupClasses: [{ group_id: 'g1', class_id: 'C1' }],
      groupTeachers: [{ group_id: 'g1', teacher_id: 'T1' }],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1)
    expect(result.unplacedCount).toBe(0)
    expect(result.newEntries).toHaveLength(1)

    const newEntries = withFakeIds(result.newEntries)
    const fullCtx = { ...ctx, entries: [...ctx.entries, ...newEntries] }
    const hardViolations = runAllRules(fullCtx).filter((v) => v.severity === 'hard')
    const newIds = new Set(newEntries.map((e) => e.id))
    expect(hardViolations.some((v) => v.entryIds.some((id) => newIds.has(id)))).toBe(false)
  })

  it('places EPS as a 2-slot block on the terrain in a valid window', () => {
    const g = group('geps', 'EPS', 'EPS C1', [2])
    const ctx = baseContext({
      teachingGroups: [g],
      groupClasses: [{ group_id: 'geps', class_id: 'C1' }],
      groupTeachers: [{ group_id: 'geps', teacher_id: 'T1' }],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1)
    expect(result.newEntries).toHaveLength(1)
    const placed = result.newEntries[0]
    expect(placed.slot_count).toBe(2)
    expect(placed.room_id).toBe('TERRAIN')
    expect([1, 4]).toContain(placed.start_slot_order)

    const newEntries = withFakeIds(result.newEntries)
    const fullCtx = { ...ctx, entries: [...ctx.entries, ...newEntries] }
    const hardViolations = runAllRules(fullCtx).filter((v) => v.severity === 'hard')
    expect(hardViolations.some((v) => v.ruleCode === 'eps_placement')).toBe(false)
  })

  it('places a paired group (tandem) simultaneously in 2 distinct rooms', () => {
    const gPC = group('gPC', 'PC', 'PC C1', [1], 'gSVT')
    const gSVT = group('gSVT', 'SVT', 'SVT C1', [1], 'gPC')
    const ctx = baseContext({
      teachingGroups: [gPC, gSVT],
      groupClasses: [
        { group_id: 'gPC', class_id: 'C1' },
        { group_id: 'gSVT', class_id: 'C1' },
      ],
      groupTeachers: [
        { group_id: 'gPC', teacher_id: 'T1' },
        { group_id: 'gSVT', teacher_id: 'T2' },
      ],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1) // 1 seance "tandem" => 2 lignes
    expect(result.newEntries).toHaveLength(2)

    const [a, b] = result.newEntries
    expect(a.day_of_week).toBe(b.day_of_week)
    expect(a.start_slot_order).toBe(b.start_slot_order)
    expect(a.slot_count).toBe(b.slot_count)
    expect(a.room_id).not.toBe(b.room_id)

    const newEntries = withFakeIds(result.newEntries)
    const fullCtx = { ...ctx, entries: [...ctx.entries, ...newEntries] }
    const hardViolations = runAllRules(fullCtx).filter((v) => v.severity === 'hard')
    expect(hardViolations.some((v) => v.ruleCode === 'paired_group_simultaneity')).toBe(false)
    expect(hardViolations.some((v) => v.ruleCode.startsWith('resource_unicity'))).toBe(false)
  })

  it('never touches or duplicates an already-placed entry', () => {
    const g = group('g1', 'MATH', 'Maths C1', [1, 1])
    const existing = entry('e1', 'g1', 1, 1, 1, 'S1')
    const ctx = baseContext({
      teachingGroups: [g],
      groupClasses: [{ group_id: 'g1', class_id: 'C1' }],
      groupTeachers: [{ group_id: 'g1', teacher_id: 'T1' }],
      entries: [existing],
    })

    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.placedCount).toBe(1)
    expect(result.newEntries).toHaveLength(1)
    const placed = result.newEntries[0]
    // Ne doit pas rentrer en collision avec la seance existante (meme jour/creneau).
    expect(placed.day_of_week === existing.day_of_week && placed.start_slot_order === existing.start_slot_order).toBe(false)
  })

  it('reports unplaced sessions instead of throwing when over-constrained', () => {
    // Bien plus de volume que de creneaux disponibles (4 creneaux "cours"/jour x 2 jours = 8).
    const g = group('g1', 'MATH', 'Maths C1', [1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    const ctx = baseContext({
      teachingGroups: [g],
      groupClasses: [{ group_id: 'g1', class_id: 'C1' }],
      groupTeachers: [{ group_id: 'g1', teacher_id: 'T1' }],
    })

    expect(() => autoGenerateSchedule(ctx, 'ay-1')).not.toThrow()
    const result = autoGenerateSchedule(ctx, 'ay-1')
    expect(result.unplacedCount).toBeGreaterThan(0)
    expect(result.placedCount + result.unplacedCount).toBe(10)
  })
})
