import { describe, expect, it } from 'vitest'

import { resourceUnicity } from '@/lib/constraints/rules/resourceUnicity'
import { teacherCeiling } from '@/lib/constraints/rules/teacherCeiling'
import { maxLevelsPerCycle } from '@/lib/constraints/rules/maxLevelsPerCycle'
import { antiMonopoly } from '@/lib/constraints/rules/antiMonopoly'
import { sequencing } from '@/lib/constraints/rules/sequencing'
import { epsPlacement } from '@/lib/constraints/rules/epsPlacement'
import { gapsPlacement } from '@/lib/constraints/rules/gapsPlacement'
import { pairedGroupSimultaneity } from '@/lib/constraints/rules/pairedGroupSimultaneity'
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
  { id: 'L5', establishment_id: EST, name: '5eme', cycle: 'college', order_index: 2 },
  { id: 'L4', establishment_id: EST, name: '4eme', cycle: 'college', order_index: 3 },
  { id: 'L3', establishment_id: EST, name: '3eme', cycle: 'college', order_index: 4 },
]

const classes: Tables<'classes'>[] = [
  { id: 'C1', establishment_id: EST, level_id: 'L6', name: '6eme 1', headcount: 30 },
  { id: 'C2', establishment_id: EST, level_id: 'L6', name: '6eme 2', headcount: 30 },
  { id: 'C3', establishment_id: EST, level_id: 'L5', name: '5eme 1', headcount: 30 },
  { id: 'C4', establishment_id: EST, level_id: 'L4', name: '4eme 1', headcount: 30 },
  { id: 'C5', establishment_id: EST, level_id: 'L3', name: '3eme 1', headcount: 30 },
]

const subjects: Tables<'subjects'>[] = [
  { id: 'FRA', establishment_id: EST, code: 'FRA', name: 'Francais', subject_group: 'langues' },
  { id: 'ANG', establishment_id: EST, code: 'ANG', name: 'Anglais', subject_group: 'langues' },
  { id: 'MATH', establishment_id: EST, code: 'MATH', name: 'Mathematiques', subject_group: 'sciences' },
  { id: 'PC', establishment_id: EST, code: 'PC', name: 'Physique-Chimie', subject_group: 'sciences' },
  { id: 'SVT', establishment_id: EST, code: 'SVT', name: 'SVT', subject_group: 'sciences' },
  { id: 'HG', establishment_id: EST, code: 'HG', name: 'Histoire-Geo', subject_group: 'autre' },
  { id: 'EPS', establishment_id: EST, code: 'EPS', name: 'EPS', subject_group: 'autre' },
]

const teachers: Tables<'teachers'>[] = [
  { id: 'T1', establishment_id: EST, full_name: 'Prof 1', max_weekly_hours: 20 },
  { id: 'T2', establishment_id: EST, full_name: 'Prof 2', max_weekly_hours: 20 },
  { id: 'T3', establishment_id: EST, full_name: 'Prof 3', max_weekly_hours: 2 },
]

// Lundi : creneaux cours 1,2 / recreation 3 / cours 4,5 / dejeuner 6 / cours 7,8.
const timeSlots: Tables<'time_slots'>[] = [
  { id: 'ts1', establishment_id: EST, day_of_week: 1, order_index: 1, kind: 'cours', start_time: '08:00:00', end_time: '09:00:00' },
  { id: 'ts2', establishment_id: EST, day_of_week: 1, order_index: 2, kind: 'cours', start_time: '09:00:00', end_time: '10:00:00' },
  { id: 'ts3', establishment_id: EST, day_of_week: 1, order_index: 3, kind: 'recreation', start_time: '10:00:00', end_time: '10:15:00' },
  { id: 'ts4', establishment_id: EST, day_of_week: 1, order_index: 4, kind: 'cours', start_time: '10:15:00', end_time: '11:15:00' },
  { id: 'ts5', establishment_id: EST, day_of_week: 1, order_index: 5, kind: 'cours', start_time: '11:15:00', end_time: '12:15:00' },
  { id: 'ts6', establishment_id: EST, day_of_week: 1, order_index: 6, kind: 'dejeuner', start_time: '12:15:00', end_time: '14:00:00' },
  { id: 'ts7', establishment_id: EST, day_of_week: 1, order_index: 7, kind: 'cours', start_time: '14:00:00', end_time: '15:00:00' },
  { id: 'ts8', establishment_id: EST, day_of_week: 1, order_index: 8, kind: 'cours', start_time: '15:00:00', end_time: '16:00:00' },
]

function group(
  id: string,
  subjectId: string,
  label: string,
  pairedGroupId: string | null = null,
): Tables<'teaching_groups'> {
  return {
    id,
    establishment_id: EST,
    subject_id: subjectId,
    label,
    session_slot_lengths: [1],
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

describe('resourceUnicity', () => {
  it('flags a room double-booking', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const gb = group('gb', 'FRA', 'Francais C2')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      groupClasses: [
        { group_id: 'ga', class_id: 'C1' },
        { group_id: 'gb', class_id: 'C2' },
      ],
      groupTeachers: [
        { group_id: 'ga', teacher_id: 'T1' },
        { group_id: 'gb', teacher_id: 'T2' },
      ],
      entries: [entry('e1', 'ga', 1, 1, 1, 'S1'), entry('e2', 'gb', 1, 1, 1, 'S1')],
    })
    const violations = resourceUnicity(ctx)
    expect(violations.some((v) => v.ruleCode === 'resource_unicity_room')).toBe(true)
    expect(violations.some((v) => v.ruleCode === 'resource_unicity_teacher')).toBe(false)
    expect(violations.some((v) => v.ruleCode === 'resource_unicity_class')).toBe(false)
  })

  it('flags a teacher double-booking', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const gb = group('gb', 'FRA', 'Francais C2')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      groupClasses: [
        { group_id: 'ga', class_id: 'C1' },
        { group_id: 'gb', class_id: 'C2' },
      ],
      groupTeachers: [
        { group_id: 'ga', teacher_id: 'T1' },
        { group_id: 'gb', teacher_id: 'T1' },
      ],
      entries: [entry('e1', 'ga', 1, 1, 1, 'S1'), entry('e2', 'gb', 1, 1, 1, 'S2')],
    })
    const violations = resourceUnicity(ctx)
    expect(violations.some((v) => v.ruleCode === 'resource_unicity_teacher')).toBe(true)
  })

  it('flags a class double-booking when groups are not paired', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const gb = group('gb', 'FRA', 'Francais C1')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      groupClasses: [
        { group_id: 'ga', class_id: 'C1' },
        { group_id: 'gb', class_id: 'C1' },
      ],
      groupTeachers: [
        { group_id: 'ga', teacher_id: 'T1' },
        { group_id: 'gb', teacher_id: 'T2' },
      ],
      entries: [entry('e1', 'ga', 1, 1, 1, 'S1'), entry('e2', 'gb', 1, 1, 1, 'S2')],
    })
    expect(resourceUnicity(ctx).some((v) => v.ruleCode === 'resource_unicity_class')).toBe(true)
  })

  it('allows a tandem (paired groups) to share the same class and slot', () => {
    const ga = group('ga', 'PC', 'PC C1', 'gb')
    const gb = group('gb', 'SVT', 'SVT C1', 'ga')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      groupClasses: [
        { group_id: 'ga', class_id: 'C1' },
        { group_id: 'gb', class_id: 'C1' },
      ],
      groupTeachers: [
        { group_id: 'ga', teacher_id: 'T1' },
        { group_id: 'gb', teacher_id: 'T2' },
      ],
      entries: [entry('e1', 'ga', 1, 1, 1, 'L1'), entry('e2', 'gb', 1, 1, 1, 'L2')],
    })
    expect(resourceUnicity(ctx)).toHaveLength(0)
  })
})

describe('pairedGroupSimultaneity', () => {
  it('flags a tandem placed on mismatched slots', () => {
    const ga = group('ga', 'PC', 'PC C1', 'gb')
    const gb = group('gb', 'SVT', 'SVT C1', 'ga')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      entries: [entry('e1', 'ga', 1, 1, 1, 'L1'), entry('e2', 'gb', 1, 4, 1, 'L2')],
    })
    expect(pairedGroupSimultaneity(ctx).length).toBeGreaterThan(0)
  })

  it('does not flag a tandem correctly placed in 2 rooms at the same slot', () => {
    const ga = group('ga', 'PC', 'PC C1', 'gb')
    const gb = group('gb', 'SVT', 'SVT C1', 'ga')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      entries: [entry('e1', 'ga', 1, 1, 1, 'L1'), entry('e2', 'gb', 1, 1, 1, 'L2')],
    })
    expect(pairedGroupSimultaneity(ctx)).toHaveLength(0)
  })
})

describe('teacherCeiling', () => {
  it('flags a teacher over their weekly ceiling', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const ctx = baseContext({
      teachingGroups: [ga],
      groupTeachers: [{ group_id: 'ga', teacher_id: 'T3' }],
      entries: [entry('e1', 'ga', 1, 1, 3, 'S1')], // T3 plafond = 2h
    })
    const violations = teacherCeiling(ctx)
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleCode).toBe('teacher_ceiling')
  })
})

describe('maxLevelsPerCycle', () => {
  it('flags a teacher spread across more than 3 college levels', () => {
    const groups = ['g1', 'g2', 'g3', 'g4'].map((id, i) => group(id, 'MATH', `Math ${i}`))
    const ctx = baseContext({
      teachingGroups: groups,
      groupClasses: [
        { group_id: 'g1', class_id: 'C1' }, // 6eme
        { group_id: 'g2', class_id: 'C3' }, // 5eme
        { group_id: 'g3', class_id: 'C4' }, // 4eme
        { group_id: 'g4', class_id: 'C5' }, // 3eme
      ],
      groupTeachers: groups.map((g) => ({ group_id: g.id, teacher_id: 'T1' })),
      entries: [
        entry('e1', 'g1', 1, 1, 1, 'S1'),
        entry('e2', 'g2', 2, 1, 1, 'S1'),
        entry('e3', 'g3', 3, 1, 1, 'S1'),
        entry('e4', 'g4', 4, 1, 1, 'S1'),
      ],
    })
    expect(maxLevelsPerCycle(ctx).some((v) => v.ruleCode === 'max_levels_per_cycle')).toBe(true)
  })
})

describe('antiMonopoly', () => {
  it('flags a teacher covering every class of a level for one subject', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const gb = group('gb', 'MATH', 'Math C2')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      groupClasses: [
        { group_id: 'ga', class_id: 'C1' },
        { group_id: 'gb', class_id: 'C2' },
      ],
      groupTeachers: [
        { group_id: 'ga', teacher_id: 'T1' },
        { group_id: 'gb', teacher_id: 'T1' },
      ],
      entries: [entry('e1', 'ga', 1, 1, 1, 'S1'), entry('e2', 'gb', 2, 1, 1, 'S1')],
    })
    expect(antiMonopoly(ctx).some((v) => v.ruleCode === 'anti_monopoly')).toBe(true)
  })

  it('does not flag when classes of a level are split across teachers', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const gb = group('gb', 'MATH', 'Math C2')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      groupClasses: [
        { group_id: 'ga', class_id: 'C1' },
        { group_id: 'gb', class_id: 'C2' },
      ],
      groupTeachers: [
        { group_id: 'ga', teacher_id: 'T1' },
        { group_id: 'gb', teacher_id: 'T2' },
      ],
      entries: [entry('e1', 'ga', 1, 1, 1, 'S1'), entry('e2', 'gb', 2, 1, 1, 'S1')],
    })
    expect(antiMonopoly(ctx)).toHaveLength(0)
  })
})

describe('sequencing', () => {
  it('flags 2 langues subjects enchained, same-subject-twice and min-subjects', () => {
    const gFra = group('gFra', 'FRA', 'Francais C1')
    const gAng = group('gAng', 'ANG', 'Anglais C1')
    const gFra2 = group('gFra2', 'FRA', 'Francais C1 bis')
    const ctx = baseContext({
      teachingGroups: [gFra, gAng, gFra2],
      groupClasses: [
        { group_id: 'gFra', class_id: 'C1' },
        { group_id: 'gAng', class_id: 'C1' },
        { group_id: 'gFra2', class_id: 'C1' },
      ],
      entries: [
        entry('e1', 'gFra', 1, 1, 1, 'S1'), // 08-09 FRA
        entry('e2', 'gAng', 1, 2, 1, 'S1'), // 09-10 ANG (enchaine avec FRA)
        entry('e3', 'gFra2', 1, 4, 1, 'S1'), // 10h15-11h15 FRA (2e fois dans la journee)
      ],
    })
    const violations = sequencing(ctx)
    expect(violations.some((v) => v.ruleCode === 'sequencing_langues')).toBe(true)
    expect(violations.some((v) => v.ruleCode === 'sequencing_same_subject_twice')).toBe(true)
    expect(violations.some((v) => v.ruleCode === 'sequencing_min_subjects')).toBe(true)
  })

  it('flags 2 sciences subjects enchained', () => {
    const gMath = group('gMath', 'MATH', 'Math C1')
    const gPc = group('gPc', 'PC', 'PC C1')
    const ctx = baseContext({
      teachingGroups: [gMath, gPc],
      groupClasses: [
        { group_id: 'gMath', class_id: 'C1' },
        { group_id: 'gPc', class_id: 'C1' },
      ],
      entries: [entry('e1', 'gMath', 1, 1, 1, 'S1'), entry('e2', 'gPc', 1, 2, 1, 'S1')],
    })
    expect(sequencing(ctx).some((v) => v.ruleCode === 'sequencing_sciences')).toBe(true)
  })

  it('does not flag a recreation-separated pair of langues subjects', () => {
    const gFra = group('gFra', 'FRA', 'Francais C1')
    const gAng = group('gAng', 'ANG', 'Anglais C1')
    const ctx = baseContext({
      teachingGroups: [gFra, gAng],
      groupClasses: [
        { group_id: 'gFra', class_id: 'C1' },
        { group_id: 'gAng', class_id: 'C1' },
      ],
      entries: [entry('e1', 'gFra', 1, 2, 1, 'S1'), entry('e2', 'gAng', 1, 4, 1, 'S1')],
    })
    expect(sequencing(ctx).some((v) => v.ruleCode === 'sequencing_langues')).toBe(false)
  })
})

describe('epsPlacement', () => {
  it('accepts a 2h EPS block on the terrain at the start of the day', () => {
    const gEps = group('gEps', 'EPS', 'EPS C1')
    const ctx = baseContext({
      teachingGroups: [gEps],
      entries: [entry('e1', 'gEps', 1, 1, 2, 'TERRAIN')],
    })
    expect(epsPlacement(ctx)).toHaveLength(0)
  })

  it('flags EPS placed in the middle of the day', () => {
    const gEps = group('gEps', 'EPS', 'EPS C1')
    const ctx = baseContext({
      teachingGroups: [gEps],
      entries: [entry('e1', 'gEps', 1, 4, 2, 'TERRAIN')],
    })
    expect(epsPlacement(ctx).some((v) => v.ruleCode === 'eps_placement')).toBe(true)
  })

  it('flags EPS not held on the terrain', () => {
    const gEps = group('gEps', 'EPS', 'EPS C1')
    const ctx = baseContext({
      teachingGroups: [gEps],
      entries: [entry('e1', 'gEps', 1, 1, 2, 'S1')],
    })
    expect(epsPlacement(ctx).some((v) => v.ruleCode === 'eps_placement')).toBe(true)
  })
})

describe('gapsPlacement', () => {
  it('flags a gap sandwiched between 2 occupied slots', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const gb = group('gb', 'FRA', 'Francais C1')
    const ctx = baseContext({
      teachingGroups: [ga, gb],
      groupClasses: [
        { group_id: 'ga', class_id: 'C1' },
        { group_id: 'gb', class_id: 'C1' },
      ],
      entries: [entry('e1', 'ga', 1, 1, 1, 'S1'), entry('e2', 'gb', 1, 4, 1, 'S1')],
    })
    expect(gapsPlacement(ctx).some((v) => v.ruleCode === 'gaps_sandwiched')).toBe(true)
  })

  it('does not flag a trailing gap at the end of the day', () => {
    const ga = group('ga', 'MATH', 'Math C1')
    const ctx = baseContext({
      teachingGroups: [ga],
      groupClasses: [{ group_id: 'ga', class_id: 'C1' }],
      entries: [entry('e1', 'ga', 1, 4, 1, 'S1')],
    })
    expect(gapsPlacement(ctx)).toHaveLength(0)
  })
})
