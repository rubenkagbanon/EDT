import { useQuery } from '@tanstack/react-query'

import {
  classesResource,
  curriculumItemsResource,
  levelsResource,
  roomsResource,
  scheduleEntriesResource,
  subjectsResource,
  teachersResource,
  timeSlotsResource,
} from '@/features/setup/resources'
import { listTeacherSubjects } from '@/features/setup/teacherSubjects'
import { listTeacherLevels } from '@/features/setup/teacherLevels'
import { teacherUnavailabilityResource } from '@/features/setup/teacherUnavailability'
import { listEntryClasses } from '@/features/setup/scheduleEntryClasses'
import { fetchEstablishmentSettings } from '@/features/setup/establishmentSettings'
import type { ScheduleContext } from '@/lib/constraints/types'

export function scheduleContextQueryKey(establishmentId: string) {
  return ['schedule-context', establishmentId] as const
}

async function fetchScheduleContext(establishmentId: string): Promise<ScheduleContext> {
  const [
    timeSlots,
    rooms,
    classes,
    levels,
    subjects,
    teachers,
    teacherSubjects,
    teacherLevels,
    teacherUnavailability,
    curriculumItems,
    entries,
    entryClasses,
    settings,
  ] = await Promise.all([
    timeSlotsResource.list(establishmentId),
    roomsResource.list(establishmentId),
    classesResource.list(establishmentId),
    levelsResource.list(establishmentId),
    subjectsResource.list(establishmentId),
    teachersResource.list(establishmentId),
    listTeacherSubjects(establishmentId),
    listTeacherLevels(establishmentId),
    teacherUnavailabilityResource.list(establishmentId),
    curriculumItemsResource.list(establishmentId),
    scheduleEntriesResource.list(establishmentId),
    listEntryClasses(establishmentId),
    fetchEstablishmentSettings(establishmentId),
  ])

  return {
    timeSlots,
    rooms,
    classes,
    levels,
    subjects,
    teachers,
    teacherSubjects,
    teacherLevels,
    teacherUnavailability,
    curriculumItems,
    entries,
    entryClasses,
    settings,
  }
}

export function useScheduleContext(establishmentId: string) {
  return useQuery({
    queryKey: scheduleContextQueryKey(establishmentId),
    queryFn: () => fetchScheduleContext(establishmentId),
  })
}
