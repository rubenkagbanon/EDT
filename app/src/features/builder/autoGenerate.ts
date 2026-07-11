import { classesOfGroup, courseSlotsForDay, remainingSessionsForGroup, teachersOfGroup } from '@/lib/constraints/helpers'
import type { ScheduleContext } from '@/lib/constraints/types'
import type { Tables, TablesInsert } from '@/types/database.types'

export type AutoGenerateResult = {
  newEntries: TablesInsert<'schedule_entries'>[]
  placedCount: number
  unplacedCount: number
}

type PlacementUnit = {
  groupId: string
  pairedGroupId: string | null
  length: number
  subjectId: string
  subjectCode: string
}

const RESTARTS = 6

/** PRNG deterministe (mulberry32) : un essai donne un ordonnancement reproductible. */
function mulberry32(seed: number) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function markRange(set: Set<number>, start: number, count: number) {
  for (let i = start; i < start + count; i++) set.add(i)
}

function isRangeBusy(map: Map<string, Set<number>>, key: string, start: number, count: number) {
  const set = map.get(key)
  if (!set) return false
  for (let i = start; i < start + count; i++) if (set.has(i)) return true
  return false
}

function markIdsBusy(map: Map<string, Set<number>>, ids: string[], day: number, start: number, count: number) {
  for (const id of ids) {
    const key = `${id}:${day}`
    const set = map.get(key) ?? new Set<number>()
    markRange(set, start, count)
    map.set(key, set)
  }
}

function anyIdBusy(map: Map<string, Set<number>>, ids: string[], day: number, start: number, count: number) {
  return ids.some((id) => isRangeBusy(map, `${id}:${day}`, start, count))
}

/** Fenetres EPS : les 2 premiers ou 2 derniers creneaux "cours" de la journee (miroir de epsPlacement). */
function epsWindows(daySlots: Tables<'time_slots'>[]): number[] {
  if (daySlots.length < 2) return []
  const first = daySlots[0].order_index
  const last = daySlots[daySlots.length - 2].order_index
  return [...new Set([first, last])]
}

/** Fenetres glissantes de `length` creneaux "cours" strictement contigus (pas de trou/pause au milieu). */
function slidingWindows(daySlots: Tables<'time_slots'>[], length: number): number[] {
  const starts: number[] = []
  for (let i = 0; i + length <= daySlots.length; i++) {
    let contiguous = true
    for (let k = 0; k < length - 1; k++) {
      if (daySlots[i + k + 1].order_index !== daySlots[i + k].order_index + 1) {
        contiguous = false
        break
      }
    }
    if (contiguous) starts.push(daySlots[i].order_index)
  }
  return starts
}

/** Meme ordre de priorite que `defaultRoomFor` (BuilderPage), mais une liste complete de candidats. */
function pickRoomCandidates(ctx: ScheduleContext, subjectCode: string, isPaired: boolean): string[] {
  if (subjectCode === 'EPS') {
    return ctx.rooms.filter((r) => r.room_type === 'terrain').map((r) => r.id)
  }
  if (isPaired) {
    const labs = ctx.rooms.filter((r) => r.room_type === 'laboratoire').map((r) => r.id)
    if (labs.length >= 2) return labs
    return ctx.rooms.map((r) => r.id)
  }
  const principal = ctx.rooms.filter((r) => r.room_type === 'salle_principale').map((r) => r.id)
  if (principal.length > 0) return principal
  const polyvalente = ctx.rooms.filter((r) => r.room_type === 'polyvalente').map((r) => r.id)
  if (polyvalente.length > 0) return polyvalente
  return ctx.rooms.map((r) => r.id)
}

function exceedsCeiling(
  ctx: ScheduleContext,
  teacherIds: string[],
  teacherHours: Map<string, number>,
  addLength: number,
): boolean {
  return teacherIds.some((tid) => {
    const teacher = ctx.teachers.find((t) => t.id === tid)
    if (!teacher) return false
    const current = teacherHours.get(tid) ?? 0
    return current + addLength > teacher.max_weekly_hours
  })
}

const CHAINABLE_GROUPS = new Set(['langues', 'sciences'])

/**
 * Cout souple d'un placement candidat pour une classe donnee : mirroring
 * (approximatif, cout local rapide) des regles `sequencing` et
 * `gapsPlacement` -- la validation faisant autorite reste `runAllRules`
 * apres insertion.
 */
function softCostForClass(
  daySlots: Tables<'time_slots'>[],
  busy: Set<number>,
  subjectAtSlot: Map<number, string>,
  subjectGroupAtSlot: Map<number, string>,
  start: number,
  length: number,
  subjectId: string,
  subjectGroup: string,
): number {
  let cost = 0

  if (CHAINABLE_GROUPS.has(subjectGroup)) {
    if (subjectGroupAtSlot.get(start - 1) === subjectGroup) cost += 3
    if (subjectGroupAtSlot.get(start + length) === subjectGroup) cost += 3
  }

  for (const [orderIndex, sid] of subjectAtSlot) {
    if (sid === subjectId && (orderIndex < start || orderIndex >= start + length)) {
      cost += 2
      break
    }
  }

  const tentativeBusy = new Set(busy)
  markRange(tentativeBusy, start, length)
  for (const slot of daySlots) {
    if (tentativeBusy.has(slot.order_index)) continue
    const hasBefore = daySlots.some((s) => s.order_index < slot.order_index && tentativeBusy.has(s.order_index))
    const hasAfter = daySlots.some((s) => s.order_index > slot.order_index && tentativeBusy.has(s.order_index))
    if (hasBefore && hasAfter) cost += 1
  }

  return cost
}

type RunResult = {
  newEntries: TablesInsert<'schedule_entries'>[]
  unplaced: number
  cost: number
}

function runOnce(ctx: ScheduleContext, academicYearId: string, units: PlacementUnit[], seed: number): RunResult {
  const days = [...new Set(ctx.timeSlots.map((s) => s.day_of_week))].sort((a, b) => a - b)
  const daySlotsByDay = new Map(days.map((d) => [d, courseSlotsForDay(ctx, d)]))
  const groupsById = new Map(ctx.teachingGroups.map((g) => [g.id, g]))

  const roomBusy = new Map<string, Set<number>>()
  const teacherBusy = new Map<string, Set<number>>()
  const classBusy = new Map<string, Set<number>>()
  const teacherHours = new Map<string, number>()
  const classSubjectAtSlot = new Map<string, Map<number, string>>()
  const classSubjectGroupAtSlot = new Map<string, Map<number, string>>()

  function recordClassSubject(classId: string, day: number, start: number, length: number, subjectId: string, subjectGroup: string) {
    const key = `${classId}:${day}`
    const bySlot = classSubjectAtSlot.get(key) ?? new Map<number, string>()
    const groupBySlot = classSubjectGroupAtSlot.get(key) ?? new Map<number, string>()
    for (let i = start; i < start + length; i++) {
      bySlot.set(i, subjectId)
      groupBySlot.set(i, subjectGroup)
    }
    classSubjectAtSlot.set(key, bySlot)
    classSubjectGroupAtSlot.set(key, groupBySlot)
  }

  for (const entry of ctx.entries) {
    const group = groupsById.get(entry.teaching_group_id)
    if (!group) continue
    const subject = ctx.subjects.find((s) => s.id === group.subject_id)
    if (entry.room_id) {
      const set = roomBusy.get(`${entry.room_id}:${entry.day_of_week}`) ?? new Set<number>()
      markRange(set, entry.start_slot_order, entry.slot_count)
      roomBusy.set(`${entry.room_id}:${entry.day_of_week}`, set)
    }
    const teacherIds = teachersOfGroup(ctx, entry.teaching_group_id)
    markIdsBusy(teacherBusy, teacherIds, entry.day_of_week, entry.start_slot_order, entry.slot_count)
    for (const t of teacherIds) teacherHours.set(t, (teacherHours.get(t) ?? 0) + entry.slot_count)
    const classIds = classesOfGroup(ctx, entry.teaching_group_id)
    markIdsBusy(classBusy, classIds, entry.day_of_week, entry.start_slot_order, entry.slot_count)
    if (subject) {
      for (const classId of classIds) {
        recordClassSubject(classId, entry.day_of_week, entry.start_slot_order, entry.slot_count, subject.id, subject.subject_group)
      }
    }
  }

  const rng = mulberry32(seed * 104729 + 7)
  const ordered = [...units].sort((a, b) => {
    const aEPS = a.subjectCode === 'EPS'
    const bEPS = b.subjectCode === 'EPS'
    if (aEPS !== bEPS) return aEPS ? -1 : 1
    const aPaired = a.pairedGroupId ? 1 : 0
    const bPaired = b.pairedGroupId ? 1 : 0
    if (aPaired !== bPaired) return bPaired - aPaired
    if (a.length !== b.length) return b.length - a.length
    return rng() - 0.5
  })

  const newEntries: TablesInsert<'schedule_entries'>[] = []
  let unplaced = 0
  let totalCost = 0

  for (const unit of ordered) {
    const group = groupsById.get(unit.groupId)
    if (!group) continue
    const pairGroup = unit.pairedGroupId ? groupsById.get(unit.pairedGroupId) : undefined
    const classIds = classesOfGroup(ctx, unit.groupId)
    const teacherIds = teachersOfGroup(ctx, unit.groupId)
    const pairClassIds = pairGroup ? classesOfGroup(ctx, pairGroup.id) : []
    const pairTeacherIds = pairGroup ? teachersOfGroup(ctx, pairGroup.id) : []
    const isEPS = unit.subjectCode === 'EPS'
    const roomCandidates = pickRoomCandidates(ctx, unit.subjectCode, Boolean(pairGroup))

    let best: { day: number; start: number; roomId: string | null; pairRoomId: string | null; cost: number } | null = null

    for (const day of days) {
      const daySlots = daySlotsByDay.get(day) ?? []
      const windows = isEPS ? epsWindows(daySlots) : slidingWindows(daySlots, unit.length)

      for (const start of windows) {
        if (anyIdBusy(classBusy, classIds, day, start, unit.length)) continue
        if (anyIdBusy(teacherBusy, teacherIds, day, start, unit.length)) continue
        if (pairGroup) {
          if (anyIdBusy(classBusy, pairClassIds, day, start, unit.length)) continue
          if (anyIdBusy(teacherBusy, pairTeacherIds, day, start, unit.length)) continue
        }
        if (exceedsCeiling(ctx, teacherIds, teacherHours, unit.length)) continue
        if (pairGroup && exceedsCeiling(ctx, pairTeacherIds, teacherHours, unit.length)) continue

        for (const roomId of roomCandidates) {
          if (isEPS && ctx.rooms.find((r) => r.id === roomId)?.room_type !== 'terrain') continue
          if (isRangeBusy(roomBusy, `${roomId}:${day}`, start, unit.length)) continue

          let pairRoomId: string | null = null
          if (pairGroup) {
            const secondRoom = roomCandidates.find(
              (r) => r !== roomId && !isRangeBusy(roomBusy, `${r}:${day}`, start, unit.length),
            )
            if (!secondRoom) continue
            pairRoomId = secondRoom
          }

          let cost = 0
          for (const classId of classIds) {
            const key = `${classId}:${day}`
            cost += softCostForClass(
              daySlots,
              classBusy.get(key) ?? new Set<number>(),
              classSubjectAtSlot.get(key) ?? new Map<number, string>(),
              classSubjectGroupAtSlot.get(key) ?? new Map<number, string>(),
              start,
              unit.length,
              unit.subjectId,
              ctx.subjects.find((s) => s.id === unit.subjectId)?.subject_group ?? 'autre',
            )
          }
          cost += rng() * 0.01

          if (!best || cost < best.cost) {
            best = { day, start, roomId, pairRoomId, cost }
          }
          break
        }
      }
    }

    if (!best) {
      unplaced += 1
      continue
    }

    markIdsBusy(classBusy, classIds, best.day, best.start, unit.length)
    markIdsBusy(teacherBusy, teacherIds, best.day, best.start, unit.length)
    if (best.roomId) {
      const set = roomBusy.get(`${best.roomId}:${best.day}`) ?? new Set<number>()
      markRange(set, best.start, unit.length)
      roomBusy.set(`${best.roomId}:${best.day}`, set)
    }
    for (const t of teacherIds) teacherHours.set(t, (teacherHours.get(t) ?? 0) + unit.length)
    for (const classId of classIds) {
      recordClassSubject(classId, best.day, best.start, unit.length, unit.subjectId, ctx.subjects.find((s) => s.id === unit.subjectId)?.subject_group ?? 'autre')
    }

    newEntries.push({
      establishment_id: group.establishment_id,
      academic_year_id: academicYearId,
      teaching_group_id: unit.groupId,
      day_of_week: best.day,
      start_slot_order: best.start,
      slot_count: unit.length,
      room_id: best.roomId,
    })

    if (pairGroup) {
      markIdsBusy(classBusy, pairClassIds, best.day, best.start, unit.length)
      markIdsBusy(teacherBusy, pairTeacherIds, best.day, best.start, unit.length)
      if (best.pairRoomId) {
        const set = roomBusy.get(`${best.pairRoomId}:${best.day}`) ?? new Set<number>()
        markRange(set, best.start, unit.length)
        roomBusy.set(`${best.pairRoomId}:${best.day}`, set)
      }
      for (const t of pairTeacherIds) teacherHours.set(t, (teacherHours.get(t) ?? 0) + unit.length)
      for (const classId of pairClassIds) {
        recordClassSubject(classId, best.day, best.start, unit.length, pairGroup.subject_id, ctx.subjects.find((s) => s.id === pairGroup.subject_id)?.subject_group ?? 'autre')
      }

      newEntries.push({
        establishment_id: pairGroup.establishment_id,
        academic_year_id: academicYearId,
        teaching_group_id: pairGroup.id,
        day_of_week: best.day,
        start_slot_order: best.start,
        slot_count: unit.length,
        room_id: best.pairRoomId,
      })
    }

    totalCost += best.cost
  }

  return { newEntries, unplaced, cost: totalCost }
}

/**
 * Complete automatiquement les seances actuellement non placees, sans jamais
 * toucher aux entrees deja existantes -- un premier jet a ajuster ensuite
 * manuellement dans le builder. Recherche gloutonne a redemarrages
 * aleatoires ; les 4 regles dures pertinentes au placement (unicite,
 * plafond horaire, EPS, simultaneite tandem/LV2) sont respectees par
 * construction, les regles souples (sequencage, heures creuses) guident le
 * choix parmi les candidats valides. `runAllRules` reste la validation
 * faisant autorite une fois les entrees inserees.
 */
export function autoGenerateSchedule(ctx: ScheduleContext, academicYearId: string): AutoGenerateResult {
  const units: PlacementUnit[] = []
  for (const group of ctx.teachingGroups) {
    if (group.paired_group_id && group.id > group.paired_group_id) continue
    const subject = ctx.subjects.find((s) => s.id === group.subject_id)
    const remaining = remainingSessionsForGroup(ctx, group.id)
    for (const length of remaining) {
      units.push({
        groupId: group.id,
        pairedGroupId: group.paired_group_id,
        length,
        subjectId: group.subject_id,
        subjectCode: subject?.code ?? '',
      })
    }
  }

  let best: RunResult | null = null
  for (let attempt = 0; attempt < RESTARTS; attempt++) {
    const result = runOnce(ctx, academicYearId, units, attempt)
    if (!best || result.unplaced < best.unplaced || (result.unplaced === best.unplaced && result.cost < best.cost)) {
      best = result
    }
  }

  const newEntries = best?.newEntries ?? []
  const unplacedCount = best?.unplaced ?? units.length
  const placedCount = units.length - unplacedCount

  return { newEntries, placedCount, unplacedCount }
}
