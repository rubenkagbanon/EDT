import * as React from 'react'
import { useParams } from 'react-router-dom'
import { CalendarX, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { levelsResource, subjectsResource, teachersResource, timeSlotsResource } from '@/features/setup/resources'
import { useSetTeacherSubjects, useTeacherSubjects } from '@/features/setup/teacherSubjects'
import { useSetTeacherLevels, useTeacherLevels } from '@/features/setup/teacherLevels'
import {
  useSetTeacherUnavailability,
  useUnavailabilityForTeacher,
} from '@/features/setup/teacherUnavailability'
import { DAY_LABELS } from '@/features/builder/gridUtils'

type TeacherRow = {
  id: string | null
  fullName: string
  maxHours: string
  subjectIds: string[]
  levelIds: string[]
}

function emptyRow(): TeacherRow {
  return { id: null, fullName: '', maxHours: '0', subjectIds: [], levelIds: [] }
}

export default function TeachersPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: teachers, isLoading } = teachersResource.useList(establishmentId!, 'full_name')
  const { createMutation, updateMutation, removeMutation } = teachersResource.useMutations(establishmentId!)
  const { data: subjects } = subjectsResource.useList(establishmentId!, 'code')
  const { data: levels } = levelsResource.useList(establishmentId!, 'order_index')
  const { data: teacherSubjects } = useTeacherSubjects(establishmentId!)
  const { data: teacherLevels } = useTeacherLevels(establishmentId!)
  const setTeacherSubjects = useSetTeacherSubjects(establishmentId!)
  const setTeacherLevels = useSetTeacherLevels(establishmentId!)

  const { data: timeSlots } = timeSlotsResource.useList(establishmentId!)
  const setTeacherUnavailability = useSetTeacherUnavailability(establishmentId!)

  const [rows, setRows] = React.useState<TeacherRow[]>([emptyRow()])
  const [saving, setSaving] = React.useState(false)
  const initialized = React.useRef(false)

  const [unavailTeacherId, setUnavailTeacherId] = React.useState<string | null>(null)
  const [unavailTeacherName, setUnavailTeacherName] = React.useState('')
  const { data: unavailData } = useUnavailabilityForTeacher(unavailTeacherId ?? '')
  const [selectedSlots, setSelectedSlots] = React.useState<Set<string>>(new Set())
  const [savingUnavail, setSavingUnavail] = React.useState(false)

  React.useEffect(() => {
    if (initialized.current || !teachers || !teacherSubjects || !teacherLevels) return
    initialized.current = true
    const subjectsByTeacher = new Map<string, string[]>()
    for (const ts of teacherSubjects) {
      subjectsByTeacher.set(ts.teacher_id, [...(subjectsByTeacher.get(ts.teacher_id) ?? []), ts.subject_id])
    }
    const levelsByTeacher = new Map<string, string[]>()
    for (const tl of teacherLevels) {
      levelsByTeacher.set(tl.teacher_id, [...(levelsByTeacher.get(tl.teacher_id) ?? []), tl.level_id])
    }
    setRows(
      teachers.length > 0
        ? teachers.map((t) => ({
            id: t.id,
            fullName: t.full_name,
            maxHours: String(t.max_weekly_hours),
            subjectIds: subjectsByTeacher.get(t.id) ?? [],
            levelIds: levelsByTeacher.get(t.id) ?? [],
          }))
        : [emptyRow()],
    )
  }, [teachers, teacherSubjects, teacherLevels])

  React.useEffect(() => {
    if (unavailTeacherId && unavailData) {
      setSelectedSlots(new Set(unavailData.map((u) => `${u.day_of_week}:${u.order_index}`)))
    }
  }, [unavailTeacherId, unavailData])

  const courseOrderIndexes = [...new Set((timeSlots ?? []).filter((s) => s.kind === 'cours').map((s) => s.order_index))].sort(
    (a, b) => a - b,
  )
  const dayList = [...new Set((timeSlots ?? []).map((s) => s.day_of_week))].sort((a, b) => a - b)

  function slotLabel(orderIndex: number) {
    const sample = timeSlots?.find((s) => s.order_index === orderIndex && s.kind === 'cours')
    return sample ? `${sample.start_time.slice(0, 5)}-${sample.end_time.slice(0, 5)}` : String(orderIndex)
  }

  function addRow() {
    setRows((r) => [...r, emptyRow()])
  }

  function updateRow(index: number, patch: Partial<Pick<TeacherRow, 'fullName' | 'maxHours'>>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function toggleSubject(index: number, subjectId: string, checked: boolean) {
    setRows((r) =>
      r.map((row, i) =>
        i === index
          ? {
              ...row,
              subjectIds: checked
                ? [...row.subjectIds, subjectId]
                : row.subjectIds.filter((id) => id !== subjectId),
            }
          : row,
      ),
    )
  }

  function toggleLevel(index: number, levelId: string, checked: boolean) {
    setRows((r) =>
      r.map((row, i) =>
        i === index
          ? {
              ...row,
              levelIds: checked ? [...row.levelIds, levelId] : row.levelIds.filter((id) => id !== levelId),
            }
          : row,
      ),
    )
  }

  function openUnavailability(row: TeacherRow) {
    if (!row.id) return
    setUnavailTeacherId(row.id)
    setUnavailTeacherName(row.fullName)
  }

  function toggleUnavailSlot(day: number, orderIndex: number, checked: boolean) {
    const key = `${day}:${orderIndex}`
    setSelectedSlots((s) => {
      const next = new Set(s)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  async function handleSaveUnavailability() {
    if (!unavailTeacherId) return
    setSavingUnavail(true)
    try {
      const slots = [...selectedSlots].map((key) => {
        const [day, order] = key.split(':').map(Number)
        return { day_of_week: day, order_index: order }
      })
      await setTeacherUnavailability.mutateAsync({ teacherId: unavailTeacherId, slots })
      toast.success('Indisponibilites enregistrees.')
      setUnavailTeacherId(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSavingUnavail(false)
    }
  }

  async function handleDeleteRow(index: number) {
    const row = rows[index]
    if (row.id) {
      if (!window.confirm(`Supprimer ${row.fullName || 'cet enseignant'} ?`)) return
      try {
        await removeMutation.mutateAsync(row.id)
        toast.success('Enseignant supprime.')
      } catch (error) {
        toast.error(getErrorMessage(error))
        return
      }
    }
    setRows((r) => r.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (rows.every((r) => !r.fullName.trim())) {
      toast.error('Ajoutez au moins un enseignant.')
      return
    }
    setSaving(true)
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row.fullName.trim()) continue
        const values = { full_name: row.fullName.trim(), max_weekly_hours: Number(row.maxHours) || 0 }
        let teacherId = row.id
        if (teacherId) {
          await updateMutation.mutateAsync({ id: teacherId, values })
        } else {
          const created = await createMutation.mutateAsync(values as never)
          teacherId = created.id
          const newId = teacherId
          setRows((r) => r.map((rr, idx) => (idx === i ? { ...rr, id: newId } : rr)))
        }
        await setTeacherSubjects.mutateAsync({ teacherId, subjectIds: row.subjectIds })
        await setTeacherLevels.mutateAsync({ teacherId, levelIds: row.levelIds })
      }
      toast.success('Enseignants enregistres.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enseignants</CardTitle>
        <CardDescription>
          Plafond de service hebdomadaire, matieres et niveaux habilites pour chaque enseignant.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Nom complet</TableHead>
                  <TableHead className="w-32">Plafond hebdo.</TableHead>
                  {(subjects ?? []).map((s) => (
                    <TableHead key={s.id} className="text-center">
                      {s.code}
                    </TableHead>
                  ))}
                  {(levels ?? []).map((l) => (
                    <TableHead key={l.id} className="text-center">
                      {l.name}
                    </TableHead>
                  ))}
                  <TableHead className="w-0" />
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="p-1">
                      <Input
                        placeholder="ex. Mme Kouassi"
                        value={row.fullName}
                        onChange={(e) => updateRow(index, { fullName: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={row.maxHours}
                        onChange={(e) => updateRow(index, { maxHours: e.target.value })}
                      />
                    </TableCell>
                    {(subjects ?? []).map((s) => (
                      <TableCell key={s.id} className="p-1 text-center">
                        <Checkbox
                          checked={row.subjectIds.includes(s.id)}
                          onCheckedChange={(checked) => toggleSubject(index, s.id, Boolean(checked))}
                        />
                      </TableCell>
                    ))}
                    {(levels ?? []).map((l) => (
                      <TableCell key={l.id} className="p-1 text-center">
                        <Checkbox
                          checked={row.levelIds.includes(l.id)}
                          onCheckedChange={(checked) => toggleLevel(index, l.id, Boolean(checked))}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!row.id}
                        title={row.id ? 'Indisponibilites' : 'Enregistrez d\'abord cet enseignant'}
                        onClick={() => openUnavailability(row)}
                      >
                        <CalendarX className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="p-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteRow(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="size-4" />
            Ajouter un enseignant
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>

      <Dialog open={Boolean(unavailTeacherId)} onOpenChange={(open) => !open && setUnavailTeacherId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Indisponibilites -- {unavailTeacherName}</DialogTitle>
            <DialogDescription>Cochez les creneaux ou cet enseignant n'est pas disponible.</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  {dayList.map((d) => (
                    <TableHead key={d} className="text-center">
                      {DAY_LABELS[d]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseOrderIndexes.map((oi) => (
                  <TableRow key={oi}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {slotLabel(oi)}
                    </TableCell>
                    {dayList.map((d) => (
                      <TableCell key={d} className="text-center">
                        <Checkbox
                          checked={selectedSlots.has(`${d}:${oi}`)}
                          onCheckedChange={(checked) => toggleUnavailSlot(d, oi, Boolean(checked))}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveUnavailability} disabled={savingUnavail}>
              {savingUnavail ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
