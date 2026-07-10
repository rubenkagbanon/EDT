import { useQuery } from '@tanstack/react-query'

import {
  classesResource,
  levelsResource,
  roomsResource,
  scheduleEntriesResource,
  subjectsResource,
  teachersResource,
  teachingGroupsResource,
  timeSlotsResource,
} from '@/features/setup/resources'
import { listGroupClasses, listGroupTeachers } from '@/features/setup/teachingGroupLinks'
import type { ScheduleContext } from '@/lib/constraints/types'

export function scheduleContextQueryKey(establishmentId: string) {
  return ['schedule-context', establishmentId] as const
}

async function fetchScheduleContext(establishmentId: string): Promise<ScheduleContext> {
  const [timeSlots, rooms, classes, levels, subjects, teachers, teachingGroups, groupClasses, groupTeachers, entries] =
    await Promise.all([
      timeSlotsResource.list(establishmentId),
      roomsResource.list(establishmentId),
      classesResource.list(establishmentId),
      levelsResource.list(establishmentId),
      subjectsResource.list(establishmentId),
      teachersResource.list(establishmentId),
      teachingGroupsResource.list(establishmentId),
      listGroupClasses(establishmentId),
      listGroupTeachers(establishmentId),
      scheduleEntriesResource.list(establishmentId),
    ])

  return {
    timeSlots,
    rooms,
    classes,
    levels,
    subjects,
    teachers,
    teachingGroups,
    groupClasses,
    groupTeachers,
    entries,
  }
}

export function useScheduleContext(establishmentId: string) {
  return useQuery({
    queryKey: scheduleContextQueryKey(establishmentId),
    queryFn: () => fetchScheduleContext(establishmentId),
  })
}
