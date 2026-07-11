import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { subjectsResource, teachersResource } from '@/features/setup/resources'
import { useSetTeacherSubjects, useTeacherSubjects } from '@/features/setup/teacherSubjects'

type TeacherRow = { id: string | null; fullName: string; maxHours: string; subjectIds: string[] }

function emptyRow(): TeacherRow {
  return { id: null, fullName: '', maxHours: '0', subjectIds: [] }
}

export default function TeachersPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: teachers, isLoading } = teachersResource.useList(establishmentId!, 'full_name')
  const { createMutation, updateMutation, removeMutation } = teachersResource.useMutations(establishmentId!)
  const { data: subjects } = subjectsResource.useList(establishmentId!, 'code')
  const { data: teacherSubjects } = useTeacherSubjects(establishmentId!)
  const setTeacherSubjects = useSetTeacherSubjects(establishmentId!)

  const [rows, setRows] = React.useState<TeacherRow[]>([emptyRow()])
  const [saving, setSaving] = React.useState(false)
  const initialized = React.useRef(false)

  React.useEffect(() => {
    if (initialized.current || !teachers || !teacherSubjects) return
    initialized.current = true
    const byTeacher = new Map<string, string[]>()
    for (const ts of teacherSubjects) {
      const list = byTeacher.get(ts.teacher_id) ?? []
      list.push(ts.subject_id)
      byTeacher.set(ts.teacher_id, list)
    }
    setRows(
      teachers.length > 0
        ? teachers.map((t) => ({
            id: t.id,
            fullName: t.full_name,
            maxHours: String(t.max_weekly_hours),
            subjectIds: byTeacher.get(t.id) ?? [],
          }))
        : [emptyRow()],
    )
  }, [teachers, teacherSubjects])

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
          Plafond de service hebdomadaire et matieres habilitees pour chaque enseignant.
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
    </Card>
  )
}
