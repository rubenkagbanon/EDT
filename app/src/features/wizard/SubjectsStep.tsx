import * as React from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { levelsResource, subjectsResource, curriculumItemsResource } from '@/features/setup/resources'
import type { Tables, TablesInsert } from '@/types/database.types'

type SubjectGroup = 'langues' | 'sciences' | 'autre'
type SubjectRow = { code: string; name: string; group: SubjectGroup; existingId: string | null }

const DEFAULT_SUBJECTS: Omit<SubjectRow, 'existingId'>[] = [
  { code: 'FR', name: 'Francais', group: 'langues' },
  { code: 'MATH', name: 'Mathematiques', group: 'sciences' },
  { code: 'SVT', name: 'SVT', group: 'sciences' },
  { code: 'PC', name: 'Physique-Chimie', group: 'sciences' },
  { code: 'ANG', name: 'Anglais', group: 'langues' },
  { code: 'HG', name: 'Histoire-Geographie', group: 'autre' },
  { code: 'EDHC', name: 'EDHC', group: 'autre' },
  { code: 'EPS', name: 'EPS', group: 'autre' },
  { code: 'ALL', name: 'Allemand (LV2)', group: 'langues' },
  { code: 'ESP', name: 'Espagnol (LV2)', group: 'langues' },
  { code: 'PHILO', name: 'Philosophie', group: 'autre' },
]

const GROUP_LABELS: Record<SubjectGroup, string> = {
  langues: 'Langues',
  sciences: 'Sciences',
  autre: 'Autre',
}

export default function SubjectsStep() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const queryClient = useQueryClient()
  const { data: levels } = levelsResource.useList(establishmentId!, 'order_index')
  const { data: existingSubjects } = subjectsResource.useList(establishmentId!, 'code')
  const { data: existingCurriculum } = curriculumItemsResource.useList(establishmentId!)
  const { createManyMutation: createSubjects } = subjectsResource.useMutations(establishmentId!)
  const { createManyMutation: createCurriculum } = curriculumItemsResource.useMutations(establishmentId!)

  const [subjectRows, setSubjectRows] = React.useState<SubjectRow[]>([])
  const [hours, setHours] = React.useState<Record<string, string>>({})
  const [newSubject, setNewSubject] = React.useState({ code: '', name: '', group: 'autre' as SubjectGroup })
  const [saving, setSaving] = React.useState(false)
  const initialized = React.useRef(false)

  React.useEffect(() => {
    if (initialized.current || !existingSubjects || !existingCurriculum) return
    initialized.current = true

    const byCode = new Map(existingSubjects.map((s) => [s.code.toUpperCase(), s]))
    const rows: SubjectRow[] = DEFAULT_SUBJECTS.map((d) => {
      const existing = byCode.get(d.code.toUpperCase())
      return existing
        ? { code: existing.code, name: existing.name, group: existing.subject_group as SubjectGroup, existingId: existing.id }
        : { ...d, existingId: null }
    })
    const defaultCodes = new Set(DEFAULT_SUBJECTS.map((d) => d.code.toUpperCase()))
    for (const s of existingSubjects) {
      if (!defaultCodes.has(s.code.toUpperCase())) {
        rows.push({ code: s.code, name: s.name, group: s.subject_group as SubjectGroup, existingId: s.id })
      }
    }
    setSubjectRows(rows)

    const initialHours: Record<string, string> = {}
    for (const item of existingCurriculum) {
      initialHours[`${item.subject_id}:${item.level_id}`] = String(item.weekly_hours)
    }
    setHours(initialHours)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSubjects, existingCurriculum])

  function cellKey(row: SubjectRow, levelId: string) {
    return `${row.existingId ?? row.code}:${levelId}`
  }

  function setCell(row: SubjectRow, levelId: string, value: string) {
    setHours((h) => ({ ...h, [cellKey(row, levelId)]: value }))
  }

  function addCustomSubject() {
    const code = newSubject.code.trim().toUpperCase()
    if (!code || !newSubject.name.trim()) {
      toast.error('Code et nom requis pour ajouter une matiere.')
      return
    }
    if (subjectRows.some((r) => r.code.toUpperCase() === code)) {
      toast.error('Cette matiere existe deja dans la liste.')
      return
    }
    setSubjectRows((rows) => [
      ...rows,
      { code, name: newSubject.name.trim(), group: newSubject.group, existingId: null },
    ])
    setNewSubject({ code: '', name: '', group: 'autre' })
  }

  async function handleSave() {
    if (!levels || levels.length === 0) {
      toast.error("Ajoutez d'abord au moins un niveau (etape precedente).")
      return
    }
    const rowsWithData = subjectRows.filter((row) =>
      levels.some((l) => {
        const v = hours[cellKey(row, l.id)]
        return v !== undefined && v !== ''
      }),
    )
    if (rowsWithData.length === 0) {
      toast.error('Renseignez au moins un volume horaire.')
      return
    }
    setSaving(true)
    try {
      const toCreate = rowsWithData.filter((r) => !r.existingId)
      let createdSubjects: Tables<'subjects'>[] = []
      if (toCreate.length > 0) {
        createdSubjects = await createSubjects.mutateAsync(
          toCreate.map((r) => ({ code: r.code, name: r.name, subject_group: r.group })) as never,
        )
      }
      const idByCode = new Map<string, string>()
      for (const r of subjectRows) if (r.existingId) idByCode.set(r.code.toUpperCase(), r.existingId)
      for (const s of createdSubjects) idByCode.set(s.code.toUpperCase(), s.id)

      const existingByKey = new Map((existingCurriculum ?? []).map((c) => [`${c.subject_id}:${c.level_id}`, c]))
      const toInsert: TablesInsert<'curriculum_items'>[] = []
      const toUpdate: { id: string; weekly_hours: number }[] = []

      for (const row of rowsWithData) {
        const subjectId = idByCode.get(row.code.toUpperCase())
        if (!subjectId) continue
        for (const level of levels) {
          const raw = hours[cellKey(row, level.id)]
          if (raw === undefined || raw === '') continue
          const weeklyHours = Number(raw)
          if (!Number.isFinite(weeklyHours)) continue
          const existing = existingByKey.get(`${subjectId}:${level.id}`)
          if (existing) {
            if (existing.weekly_hours !== weeklyHours) toUpdate.push({ id: existing.id, weekly_hours: weeklyHours })
          } else {
            toInsert.push({ level_id: level.id, subject_id: subjectId, weekly_hours: weeklyHours })
          }
        }
      }

      if (toInsert.length > 0) await createCurriculum.mutateAsync(toInsert as never)
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map((u) => curriculumItemsResource.update(u.id, { weekly_hours: u.weekly_hours })))
        queryClient.invalidateQueries({ queryKey: curriculumItemsResource.queryKey(establishmentId!) })
        queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId!] })
      }

      toast.success(`${toInsert.length + toUpdate.length} volume(s) horaire(s) enregistre(s).`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (!levels) return <p className="text-sm text-muted-foreground">Chargement...</p>
  if (levels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ajoutez d'abord au moins un niveau a l'etape "Classes" pour renseigner les disciplines.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Discipline</TableHead>
              {levels.map((l) => (
                <TableHead key={l.id} className="text-center">
                  {l.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjectRows.map((row) => (
              <TableRow key={row.code}>
                <TableCell>
                  {row.name}{' '}
                  <span className="text-xs text-muted-foreground">({GROUP_LABELS[row.group]})</span>
                </TableCell>
                {levels.map((l) => (
                  <TableCell key={l.id} className="p-1 text-center">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className="mx-auto w-16 text-center"
                      value={hours[cellKey(row, l.id)] ?? ''}
                      onChange={(e) => setCell(row, l.id, e.target.value)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-input p-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Code</span>
          <Input
            className="w-24"
            value={newSubject.code}
            onChange={(e) => setNewSubject((s) => ({ ...s, code: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Nom</span>
          <Input
            className="w-48"
            value={newSubject.name}
            onChange={(e) => setNewSubject((s) => ({ ...s, name: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Groupe</span>
          <Select
            value={newSubject.group}
            onValueChange={(v) => setNewSubject((s) => ({ ...s, group: v as SubjectGroup }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="langues">Langues</SelectItem>
              <SelectItem value="sciences">Sciences</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCustomSubject}>
          <Plus className="size-4" />
          Ajouter une matiere
        </Button>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? 'Enregistrement...' : 'Enregistrer les disciplines'}
      </Button>
    </div>
  )
}
