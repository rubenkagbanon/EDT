import * as XLSX from 'xlsx'

import { entriesWithClasses } from '@/lib/constraints/helpers'
import { DAY_LABELS } from '@/features/builder/gridUtils'
import type { ScheduleContext } from '@/lib/constraints/types'

function summarySheet(ctx: ScheduleContext) {
  return [
    { Indicateur: 'Classes', Valeur: ctx.classes.length },
    { Indicateur: 'Enseignants', Valeur: ctx.teachers.length },
    { Indicateur: 'Salles', Valeur: ctx.rooms.length },
    { Indicateur: 'Matieres', Valeur: ctx.subjects.length },
    { Indicateur: 'Seances placees', Valeur: ctx.entries.length },
  ]
}

function classesSheet(ctx: ScheduleContext) {
  const entries = entriesWithClasses(ctx)
  const rows: Record<string, string | number>[] = []
  for (const cls of ctx.classes) {
    for (const entry of entries) {
      if (!entry.classIds.includes(cls.id)) continue
      const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
      const room = ctx.rooms.find((r) => r.id === entry.room_id)
      rows.push({
        Classe: cls.name,
        Jour: DAY_LABELS[entry.day_of_week] ?? entry.day_of_week,
        Debut: entry.start_slot_order,
        Duree_h: entry.slot_count,
        Cellule: `${subject?.code ?? '?'} (${room?.name ?? '?'})`,
      })
    }
  }
  return rows.sort((a, b) => String(a.Classe).localeCompare(String(b.Classe)) || Number(a.Debut) - Number(b.Debut))
}

function teachersSheet(ctx: ScheduleContext) {
  const entries = entriesWithClasses(ctx)
  const rows: Record<string, string | number>[] = []
  for (const teacher of ctx.teachers) {
    for (const entry of entries) {
      if (entry.teacher_id !== teacher.id) continue
      const room = ctx.rooms.find((r) => r.id === entry.room_id)
      const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
      const classNames = entry.classIds
        .map((id) => ctx.classes.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join('+')
      rows.push({
        Enseignant: teacher.full_name,
        Jour: DAY_LABELS[entry.day_of_week] ?? entry.day_of_week,
        Debut: entry.start_slot_order,
        Duree_h: entry.slot_count,
        Cellule: `${classNames} (${subject?.code ?? '?'}, ${room?.name ?? '?'})`,
      })
    }
  }
  return rows.sort(
    (a, b) => String(a.Enseignant).localeCompare(String(b.Enseignant)) || Number(a.Debut) - Number(b.Debut),
  )
}

function roomsSheet(ctx: ScheduleContext) {
  const entries = entriesWithClasses(ctx)
  const rows: Record<string, string | number>[] = []
  for (const room of ctx.rooms) {
    for (const entry of entries) {
      if (entry.room_id !== room.id) continue
      const subject = ctx.subjects.find((s) => s.id === entry.subject_id)
      const classNames = entry.classIds
        .map((id) => ctx.classes.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join('+')
      rows.push({
        Salle: room.name,
        Jour: DAY_LABELS[entry.day_of_week] ?? entry.day_of_week,
        Debut: entry.start_slot_order,
        Duree_h: entry.slot_count,
        Cellule: `${classNames} (${subject?.code ?? '?'})`,
      })
    }
  }
  return rows.sort((a, b) => String(a.Salle).localeCompare(String(b.Salle)) || Number(a.Debut) - Number(b.Debut))
}

export function buildAndDownloadWorkbook(ctx: ScheduleContext, establishmentName: string) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet(ctx)), 'Resume')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classesSheet(ctx)), 'EDT Classes')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teachersSheet(ctx)), 'EDT Profs')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roomsSheet(ctx)), 'EDT Salles')
  const fileName = `${establishmentName.replace(/[^a-z0-9]+/gi, '_')}_EDT.xlsx`
  XLSX.writeFile(wb, fileName)
}
