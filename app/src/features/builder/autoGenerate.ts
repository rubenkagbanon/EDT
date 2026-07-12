import {
  chunkRemainingHours,
  courseSlotsForDay,
  qualifiedTeacherIds,
  remainingHoursForClassSubject,
} from '@/lib/constraints/helpers'
import type { ScheduleContext } from '@/lib/constraints/types'
import type { Tables, TablesInsert } from '@/types/database.types'

export type AutoGenerateResult = {
  newEntries: TablesInsert<'schedule_entries'>[]
  newEntryClasses: TablesInsert<'schedule_entry_classes'>[]
  placedCount: number
  unplacedCount: number
}

type Unit = {
  classId: string
  subjectId: string
  subjectCode: string
  length: number
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

function buildUnits(ctx: ScheduleContext): Unit[] {
  const units: Unit[] = []
  for (const cls of ctx.classes) {
    const level = ctx.levels.find((l) => l.id === cls.level_id)
    if (!level) continue
    const itemsForLevel = ctx.curriculumItems.filter((c) => c.level_id === level.id)
    for (const item of itemsForLevel) {
      const remaining = remainingHoursForClassSubject(ctx, cls.id, item.subject_id)
      if (remaining <= 0) continue
      const subject = ctx.subjects.find((s) => s.id === item.subject_id)
      const subjectCode = subject?.code ?? ''
      for (const length of chunkRemainingHours(ctx, cls.id, item.subject_id, subjectCode, remaining)) {
        units.push({ classId: cls.id, subjectId: item.subject_id, subjectCode, length })
      }
    }
  }
  return units
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

/** Meme ordre de priorite que le selecteur de salle du builder. */
function pickRoomCandidates(ctx: ScheduleContext, subjectCode: string): string[] {
  if (subjectCode === 'EPS') {
    return ctx.rooms.filter((r) => r.room_type === 'terrain').map((r) => r.id)
  }
  const principal = ctx.rooms.filter((r) => r.room_type === 'salle_principale').map((r) => r.id)
  if (principal.length > 0) return principal
  const polyvalente = ctx.rooms.filter((r) => r.room_type === 'polyvalente').map((r) => r.id)
  if (polyvalente.length > 0) return polyvalente
  return ctx.rooms.map((r) => r.id)
}

const CHAINABLE_GROUPS = new Set(['langues', 'sciences'])

/**
 * Cout souple d'un placement candidat : mirroring (approximatif, cout local
 * rapide) des regles sequencing/gapsPlacement/heavySubjectsMorning -- la
 * validation faisant autorite reste `runAllRules` apres insertion.
 */
function softCost(
  ctx: ScheduleContext,
  daySlots: Tables<'time_slots'>[],
  busy: Set<number>,
  subjectAtSlot: Map<number, string>,
  subjectGroupAtSlot: Map<number, string>,
  start: number,
  length: number,
  subjectId: string,
  subjectGroup: string,
  day: number,
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

  if (ctx.settings?.lourdes_matin && ctx.settings.matieres_lourdes.includes(subjectId)) {
    const matinMax = Math.floor(daySlots.length / 2)
    const position = daySlots.findIndex((s) => s.order_index === start)
    if (position >= matinMax) cost += 2
  }

  void day
  return cost
}

type RunResult = {
  newEntries: TablesInsert<'schedule_entries'>[]
  newEntryClasses: TablesInsert<'schedule_entry_classes'>[]
  unplaced: number
  cost: number
}

function runOnce(ctx: ScheduleContext, academicYearId: string, units: Unit[], seed: number): RunResult {
  const days = [...new Set(ctx.timeSlots.map((s) => s.day_of_week))].sort((a, b) => a - b)
  const daySlotsByDay = new Map(days.map((d) => [d, courseSlotsForDay(ctx, d)]))

  const roomBusy = new Map<string, Set<number>>()
  const teacherBusy = new Map<string, Set<number>>()
  const classBusy = new Map<string, Set<number>>()
  const teacherHours = new Map<string, number>()
  const classSubjectAtSlot = new Map<string, Map<number, string>>()
  const classSubjectGroupAtSlot = new Map<string, Map<number, string>>()
  const unavailByTeacherDay = new Map<string, Set<number>>()

  for (const u of ctx.teacherUnavailability) {
    const key = `${u.teacher_id}:${u.day_of_week}`
    const set = unavailByTeacherDay.get(key) ?? new Set<number>()
    set.add(u.order_index)
    unavailByTeacherDay.set(key, set)
  }

  const classesByEntry = new Map<string, string[]>()
  for (const ec of ctx.entryClasses) {
    classesByEntry.set(ec.entry_id, [...(classesByEntry.get(ec.entry_id) ?? []), ec.class_id])
  }

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

  function markBusyFor(map: Map<string, Set<number>>, id: string, day: number, start: number, count: number) {
    const key = `${id}:${day}`
    const set = map.get(key) ?? new Set<number>()
    markRange(set, start, count)
    map.set(key, set)
  }

  for (const entry of ctx.entries) {
    const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
    if (entry.room_id) markBusyFor(roomBusy, entry.room_id, entry.day_of_week, entry.start_slot_order, entry.slot_count)
    markBusyFor(teacherBusy, entry.teacher_id, entry.day_of_week, entry.start_slot_order, entry.slot_count)
    teacherHours.set(entry.teacher_id, (teacherHours.get(entry.teacher_id) ?? 0) + entry.slot_count)
    const classIds = classesByEntry.get(entry.id) ?? []
    for (const classId of classIds) {
      markBusyFor(classBusy, classId, entry.day_of_week, entry.start_slot_order, entry.slot_count)
      if (subject) recordClassSubject(classId, entry.day_of_week, entry.start_slot_order, entry.slot_count, subject.id, subject.subject_group)
    }
  }

  const rng = mulberry32(seed * 104729 + 7)
  const ordered = [...units].sort((a, b) => {
    const aEPS = a.subjectCode === 'EPS'
    const bEPS = b.subjectCode === 'EPS'
    if (aEPS !== bEPS) return aEPS ? -1 : 1
    if (a.length !== b.length) return b.length - a.length
    return rng() - 0.5
  })

  const newEntries: TablesInsert<'schedule_entries'>[] = []
  const newEntryClasses: TablesInsert<'schedule_entry_classes'>[] = []
  let unplaced = 0
  let totalCost = 0

  const respectUnavailability = ctx.settings?.respecter_indispos ?? true

  for (const unit of ordered) {
    const cls = ctx.classes.find((c) => c.id === unit.classId)
    if (!cls) {
      unplaced += 1
      continue
    }
    const candidateTeachers = qualifiedTeacherIds(ctx, unit.subjectId, cls.level_id).sort(
      (a, b) => (teacherHours.get(a) ?? 0) - (teacherHours.get(b) ?? 0),
    )
    if (candidateTeachers.length === 0) {
      unplaced += 1
      continue
    }

    const isEPS = unit.subjectCode === 'EPS'
    const roomCandidates = pickRoomCandidates(ctx, unit.subjectCode)
    const subjectGroup = ctx.subjects.find((s) => s.id === unit.subjectId)?.subject_group ?? 'autre'

    let placed = false

    for (const teacherId of candidateTeachers) {
      const teacher = ctx.teachers.find((t) => t.id === teacherId)
      if (!teacher) continue

      let best: { day: number; start: number; roomId: string | null; cost: number } | null = null

      for (const day of days) {
        const daySlots = daySlotsByDay.get(day) ?? []
        const windows = isEPS ? epsWindows(daySlots) : slidingWindows(daySlots, unit.length)

        for (const start of windows) {
          if (isRangeBusy(classBusy, `${unit.classId}:${day}`, start, unit.length)) continue
          if (isRangeBusy(teacherBusy, `${teacherId}:${day}`, start, unit.length)) continue
          if ((teacherHours.get(teacherId) ?? 0) + unit.length > teacher.max_weekly_hours) continue
          if (respectUnavailability && isRangeBusy(unavailByTeacherDay, `${teacherId}:${day}`, start, unit.length)) continue

          for (const roomId of roomCandidates) {
            if (isEPS && ctx.rooms.find((r) => r.id === roomId)?.room_type !== 'terrain') continue
            if (isRangeBusy(roomBusy, `${roomId}:${day}`, start, unit.length)) continue

            const key = `${unit.classId}:${day}`
            const cost =
              softCost(
                ctx,
                daySlots,
                classBusy.get(key) ?? new Set<number>(),
                classSubjectAtSlot.get(key) ?? new Map<number, string>(),
                classSubjectGroupAtSlot.get(key) ?? new Map<number, string>(),
                start,
                unit.length,
                unit.subjectId,
                subjectGroup,
                day,
              ) + rng() * 0.01

            if (!best || cost < best.cost) best = { day, start, roomId, cost }
            break
          }
        }
      }

      if (best) {
        const entryId = crypto.randomUUID()
        markBusyFor(classBusy, unit.classId, best.day, best.start, unit.length)
        markBusyFor(teacherBusy, teacherId, best.day, best.start, unit.length)
        if (best.roomId) markBusyFor(roomBusy, best.roomId, best.day, best.start, unit.length)
        teacherHours.set(teacherId, (teacherHours.get(teacherId) ?? 0) + unit.length)
        recordClassSubject(unit.classId, best.day, best.start, unit.length, unit.subjectId, subjectGroup)

        newEntries.push({
          id: entryId,
          establishment_id: cls.establishment_id,
          academic_year_id: academicYearId,
          subject_id: unit.subjectId,
          teacher_id: teacherId,
          day_of_week: best.day,
          start_slot_order: best.start,
          slot_count: unit.length,
          room_id: best.roomId,
        })
        newEntryClasses.push({ entry_id: entryId, class_id: unit.classId })

        totalCost += best.cost
        placed = true
        break
      }
    }

    if (!placed) unplaced += 1
  }

  return { newEntries, newEntryClasses, unplaced, cost: totalCost }
}

/**
 * Complete automatiquement les seances actuellement non placees, sans jamais
 * toucher aux entrees deja existantes -- un premier jet a ajuster ensuite
 * manuellement dans le builder. Chaque classe est placee independamment
 * (pas de tronc commun ni de tandem generes automatiquement, comme le
 * moteur du repo de reference "ChronosCI") ; ces cas restent une action
 * manuelle dans le builder.
 */
export function autoGenerateSchedule(ctx: ScheduleContext, academicYearId: string): AutoGenerateResult {
  const units = buildUnits(ctx)

  let best: RunResult | null = null
  for (let attempt = 0; attempt < RESTARTS; attempt++) {
    const result = runOnce(ctx, academicYearId, units, attempt)
    if (!best || result.unplaced < best.unplaced || (result.unplaced === best.unplaced && result.cost < best.cost)) {
      best = result
    }
  }

  const newEntries = best?.newEntries ?? []
  const newEntryClasses = best?.newEntryClasses ?? []
  const unplacedCount = best?.unplaced ?? units.length
  const placedCount = units.length - unplacedCount

  return { newEntries, newEntryClasses, placedCount, unplacedCount }
}
