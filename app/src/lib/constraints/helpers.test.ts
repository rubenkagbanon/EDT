import { describe, expect, it } from 'vitest'

import { chunkRemainingHours, placedSessionCountForClassSubject } from '@/lib/constraints/helpers'
import type { ScheduleContext } from '@/lib/constraints/types'
import type { Tables } from '@/types/database.types'

const EST = 'est-1'

const levels: Tables<'levels'>[] = [{ id: 'L6', establishment_id: EST, name: '6eme', cycle: 'college', order_index: 1 }]

const classes: Tables<'classes'>[] = [
  { id: 'C1', establishment_id: EST, level_id: 'L6', name: '6eme 1', headcount: 30 },
]

function entry(id: string, subjectId: string, start: number, count: number): Tables<'schedule_entries'> {
  return {
    id,
    establishment_id: EST,
    academic_year_id: 'ay-1',
    subject_id: subjectId,
    teacher_id: 'T1',
    day_of_week: 1,
    start_slot_order: start,
    slot_count: count,
    room_id: 'S1',
    paired_entry_id: null,
  }
}

function baseContext(overrides: Partial<ScheduleContext>): ScheduleContext {
  return {
    timeSlots: [],
    rooms: [],
    classes,
    levels,
    subjects: [],
    teachers: [],
    teacherSubjects: [],
    teacherLevels: [],
    teacherUnavailability: [],
    curriculumItems: [],
    entries: [],
    entryClasses: [],
    settings: null,
    ...overrides,
  }
}

describe('chunkRemainingHours', () => {
  it('follows the configured session_pattern (2+1+1+1) from the start when nothing is placed yet', () => {
    const ctx = baseContext({
      curriculumItems: [
        { id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 5, session_pattern: [2, 1, 1, 1] },
      ],
    })

    expect(chunkRemainingHours(ctx, 'C1', 'MATH', 'MATH', 5)).toEqual([2, 1, 1, 1])
  })

  it('resumes the pattern after the sessions already placed', () => {
    const ctx = baseContext({
      curriculumItems: [
        { id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 5, session_pattern: [2, 1, 1, 1] },
      ],
      entries: [entry('e1', 'MATH', 1, 2)],
      entryClasses: [{ entry_id: 'e1', class_id: 'C1' }],
    })

    // 1 seance (le bloc de 2h) deja placee -- il reste 3h a repartir en 1+1+1.
    expect(placedSessionCountForClassSubject(ctx, 'C1', 'MATH')).toBe(1)
    expect(chunkRemainingHours(ctx, 'C1', 'MATH', 'MATH', 3)).toEqual([1, 1, 1])
  })

  it('repeats the last block size when remaining hours exceed the declared pattern', () => {
    const ctx = baseContext({
      curriculumItems: [
        { id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 6, session_pattern: [2, 1] },
      ],
    })

    expect(chunkRemainingHours(ctx, 'C1', 'MATH', 'MATH', 6)).toEqual([2, 1, 1, 1, 1])
  })

  it('falls back to generic 2h blocks when no pattern is configured', () => {
    const ctx = baseContext({
      curriculumItems: [
        { id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'MATH', weekly_hours: 5, session_pattern: null },
      ],
    })

    expect(chunkRemainingHours(ctx, 'C1', 'MATH', 'MATH', 5)).toEqual([2, 2, 1])
  })

  it('falls back to 2h-only blocks for EPS when no pattern is configured', () => {
    const ctx = baseContext({
      curriculumItems: [
        { id: 'ci1', establishment_id: EST, level_id: 'L6', subject_id: 'EPS', weekly_hours: 3, session_pattern: null },
      ],
    })

    expect(chunkRemainingHours(ctx, 'C1', 'EPS', 'EPS', 3)).toEqual([2])
  })
})
