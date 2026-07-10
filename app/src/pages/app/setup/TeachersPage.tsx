import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { subjectsResource, teachersResource } from '@/features/setup/resources'
import { useSetTeacherSubjects, useTeacherSubjects } from '@/features/setup/teacherSubjects'
import type { Tables } from '@/types/database.types'

type Teacher = Tables<'teachers'>

export default function TeachersPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: teachers, isLoading } = teachersResource.useList(establishmentId!, 'full_name')
  const { createMutation, updateMutation, removeMutation } = teachersResource.useMutations(
    establishmentId!,
  )
  const { data: subjects } = subjectsResource.useList(establishmentId!, 'code')
  const { data: teacherSubjects } = useTeacherSubjects(establishmentId!)
  const setTeacherSubjects = useSetTeacherSubjects(establishmentId!)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Teacher | null>(null)
  const [fullName, setFullName] = React.useState('')
  const [maxHours, setMaxHours] = React.useState('0')
  const [subjectIds, setSubjectIds] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  function subjectsFor(teacherId: string) {
    const ids = new Set(
      (teacherSubjects ?? []).filter((ts) => ts.teacher_id === teacherId).map((ts) => ts.subject_id),
    )
    return (subjects ?? []).filter((s) => ids.has(s.id))
  }

  function openCreate() {
    setEditing(null)
    setFullName('')
    setMaxHours('0')
    setSubjectIds([])
    setDialogOpen(true)
  }

  function openEdit(teacher: Teacher) {
    setEditing(teacher)
    setFullName(teacher.full_name)
    setMaxHours(String(teacher.max_weekly_hours))
    setSubjectIds(subjectsFor(teacher.id).map((s) => s.id))
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const values = { full_name: fullName, max_weekly_hours: Number(maxHours) || 0 }
      let teacherId = editing?.id
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, values })
      } else {
        const created = await createMutation.mutateAsync(values as never)
        teacherId = created.id
      }
      if (teacherId) {
        await setTeacherSubjects.mutateAsync({ teacherId, subjectIds })
      }
      toast.success('Enseignant enregistre.')
      setDialogOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(teacher: Teacher) {
    if (!window.confirm(`Supprimer ${teacher.full_name} ?`)) return
    try {
      await removeMutation.mutateAsync(teacher.id)
      toast.success('Enseignant supprime.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enseignants</CardTitle>
        <CardDescription>
          Plafond de service hebdomadaire et matieres habilitees pour chaque enseignant.
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : !teachers || teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun enseignant pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Plafond hebdo.</TableHead>
                <TableHead>Matieres</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>{teacher.full_name}</TableCell>
                  <TableCell>{teacher.max_weekly_hours} h</TableCell>
                  <TableCell>
                    {subjectsFor(teacher.id)
                      .map((s) => s.code)
                      .join(', ') || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(teacher)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(teacher)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier' : 'Ajouter'} un enseignant</DialogTitle>
            <DialogDescription>
              Le plafond horaire ne doit jamais etre depasse lors de la construction de l'EDT.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max_hours">Plafond horaire hebdomadaire</Label>
              <Input
                id="max_hours"
                type="number"
                min={0}
                step={0.5}
                required
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Matieres habilitees</Label>
              <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-input p-3">
                {(subjects ?? []).map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={subjectIds.includes(subject.id)}
                      onCheckedChange={(checked) =>
                        setSubjectIds((ids) =>
                          checked ? [...ids, subject.id] : ids.filter((id) => id !== subject.id),
                        )
                      }
                    />
                    {subject.code} - {subject.name}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
