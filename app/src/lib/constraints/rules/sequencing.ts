import { entriesWithClasses } from '@/lib/constraints/helpers'
import type { ScheduleContext, Violation } from '@/lib/constraints/types'

type ClassDaySession = {
  entryId: string
  start: number
  end: number
  subjectId: string
  subjectGroup: string
}

/**
 * Sequencage pedagogique : pas 2 matieres "langues" d'affilee, pas 2 "sciences"
 * d'affilee, pas trop de seances de la meme matiere le meme jour (seuil
 * configurable via les reglages avances), >= 3 matieres/jour.
 */
export function sequencing(ctx: ScheduleContext): Violation[] {
  const violations: Violation[] = []
  const entries = entriesWithClasses(ctx)
  const etaler = ctx.settings?.etaler ?? true
  const maxMemeMatiereJour = ctx.settings?.max_meme_matiere_jour ?? 2

  const byClassDay = new Map<string, ClassDaySession[]>()

  for (const entry of entries) {
    const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
    if (!subject) continue
    for (const classId of entry.classIds) {
      const key = `${classId}::${entry.day_of_week}`
      const list = byClassDay.get(key) ?? []
      list.push({
        entryId: entry.id,
        start: entry.start_slot_order,
        end: entry.start_slot_order + entry.slot_count,
        subjectId: subject.id,
        subjectGroup: subject.subject_group,
      })
      byClassDay.set(key, list)
    }
  }

  for (const [key, sessions] of byClassDay) {
    const [classId] = key.split('::')
    const cls = ctx.classes.find((c) => c.id === classId)
    if (!cls || sessions.length === 0) continue
    sessions.sort((a, b) => a.start - b.start)

    // Enchainements interdits (adjacence stricte : fin de A == debut de B).
    for (let i = 0; i < sessions.length - 1; i++) {
      const a = sessions[i]
      const b = sessions[i + 1]
      if (a.end !== b.start) continue
      if (a.subjectGroup === 'langues' && b.subjectGroup === 'langues') {
        violations.push({
          ruleCode: 'sequencing_langues',
          severity: 'soft',
          message: `${cls.name} : deux matieres "langues" enchainees le meme jour.`,
          entryIds: [a.entryId, b.entryId],
        })
      }
      if (a.subjectGroup === 'sciences' && b.subjectGroup === 'sciences') {
        violations.push({
          ruleCode: 'sequencing_sciences',
          severity: 'soft',
          message: `${cls.name} : deux matieres "sciences" enchainees le meme jour.`,
          entryIds: [a.entryId, b.entryId],
        })
      }
    }

    // Meme matiere trop de fois dans la journee (seuil configurable, regle
    // desactivee si "etaler" est faux dans les reglages avances).
    if (etaler) {
      const bySubject = new Map<string, string[]>()
      for (const s of sessions) {
        bySubject.set(s.subjectId, [...(bySubject.get(s.subjectId) ?? []), s.entryId])
      }
      for (const [subjectId, entryIds] of bySubject) {
        if (entryIds.length > maxMemeMatiereJour) {
          const subject = ctx.subjects.find((s) => s.id === subjectId)
          violations.push({
            ruleCode: 'sequencing_same_subject_twice',
            severity: 'soft',
            message: `${cls.name} : ${subject?.name ?? subjectId} programmee ${entryIds.length}x le meme jour (max ${maxMemeMatiereJour}).`,
            entryIds,
          })
        }
      }
    }

    // Minimum 3 matieres differentes dans la journee.
    const distinctSubjects = new Set(sessions.map((s) => s.subjectId))
    if (distinctSubjects.size < 3) {
      violations.push({
        ruleCode: 'sequencing_min_subjects',
        severity: 'soft',
        message: `${cls.name} : seulement ${distinctSubjects.size} matiere(s) differente(s) dans la journee (min. 3 recommande).`,
        entryIds: sessions.map((s) => s.entryId),
      })
    }
  }

  return violations
}
