import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  classesResource,
  subjectsResource,
  teachersResource,
  teachingGroupsResource,
} from '@/features/setup/resources'
import {
  useGroupClasses,
  useGroupTeachers,
  useSetGroupClasses,
  useSetGroupTeachers,
} from '@/features/setup/teachingGroupLinks'
import type { Tables } from '@/types/database.types'

type TeachingGroup = Tables<'teaching_groups'>

const NONE = '__none__'

export default function GroupsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: groups, isLoading } = teachingGroupsResource.useList(establishmentId!, 'label')
  const { createMutation, updateMutation, removeMutation } = teachingGroupsResource.useMutations(
    establishmentId!,
  )
  const { data: subjects } = subjectsResource.useList(establishmentId!, 'code')
  const { data: classes } = classesResource.useList(establishmentId!, 'name')
  const { data: teachers } = teachersResource.useList(establishmentId!, 'full_name')
  const { data: groupClasses } = useGroupClasses(establishmentId!)
  const { data: groupTeachers } = useGroupTeachers(establishmentId!)
  const setGroupClasses = useSetGroupClasses(establishmentId!)
  const setGroupTeachers = useSetGroupTeachers(establishmentId!)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TeachingGroup | null>(null)
  const [subjectId, setSubjectId] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [sessionPattern, setSessionPattern] = React.useState('1')
  const [pairedGroupId, setPairedGroupId] = React.useState(NONE)
  const [classIds, setClassIds] = React.useState<string[]>([])
  const [teacherIds, setTeacherIds] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  function classesForGroup(groupId: string) {
    const ids = new Set((groupClasses ?? []).filter((g) => g.group_id === groupId).map((g) => g.class_id))
    return (classes ?? []).filter((c) => ids.has(c.id))
  }
  function teachersForGroup(groupId: string) {
    const ids = new Set(
      (groupTeachers ?? []).filter((g) => g.group_id === groupId).map((g) => g.teacher_id),
    )
    return (teachers ?? []).filter((t) => ids.has(t.id))
  }
  function subjectLabel(id: string) {
    const s = subjects?.find((s) => s.id === id)
    return s ? `${s.code} - ${s.name}` : id
  }
  function groupLabel(id: string) {
    return groups?.find((g) => g.id === id)?.label ?? id
  }

  function openCreate() {
    setEditing(null)
    setSubjectId(subjects?.[0]?.id ?? '')
    setLabel('')
    setSessionPattern('1')
    setPairedGroupId(NONE)
    setClassIds([])
    setTeacherIds([])
    setDialogOpen(true)
  }

  // Si la liste des matieres finit de charger apres l'ouverture du dialogue
  // (creation), on complete la selection par defaut au lieu de la laisser vide.
  React.useEffect(() => {
    if (dialogOpen && !editing && !subjectId && subjects && subjects.length > 0) {
      setSubjectId(subjects[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, dialogOpen, editing])

  function openEdit(group: TeachingGroup) {
    setEditing(group)
    setSubjectId(group.subject_id)
    setLabel(group.label)
    setSessionPattern((group.session_slot_lengths ?? []).join(','))
    setPairedGroupId(group.paired_group_id ?? NONE)
    setClassIds(classesForGroup(group.id).map((c) => c.id))
    setTeacherIds(teachersForGroup(group.id).map((t) => t.id))
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) {
      toast.error('Choisissez une matiere.')
      return
    }
    setSaving(true)
    try {
      const sessionSlotLengths = sessionPattern
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)

      const values = {
        subject_id: subjectId,
        label,
        session_slot_lengths: sessionSlotLengths,
        paired_group_id: pairedGroupId === NONE ? null : pairedGroupId,
      }

      let groupId = editing?.id
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, values })
      } else {
        const created = await createMutation.mutateAsync(values as never)
        groupId = created.id
      }
      if (groupId) {
        await setGroupClasses.mutateAsync({ groupId, classIds })
        await setGroupTeachers.mutateAsync({ groupId, teacherIds })
      }
      toast.success('Groupe pedagogique enregistre.')
      setDialogOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(group: TeachingGroup) {
    if (!window.confirm(`Supprimer le groupe "${group.label}" ?`)) return
    try {
      await removeMutation.mutateAsync(group.id)
      toast.success('Groupe supprime.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Groupes pedagogiques</CardTitle>
        <CardDescription>
          Un groupe = une matiere placee dans la grille. Une classe = cours normal, plusieurs classes = tronc
          commun, deux groupes lies entre eux = tandem (PC/SVT) ou LV2 simultanee.
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
        ) : !groups || groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun groupe pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Matiere</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Enseignant(s)</TableHead>
                <TableHead>Seances</TableHead>
                <TableHead>Lie a</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.label}</TableCell>
                  <TableCell>{subjectLabel(group.subject_id)}</TableCell>
                  <TableCell>
                    {classesForGroup(group.id)
                      .map((c) => c.name)
                      .join(', ') || '-'}
                  </TableCell>
                  <TableCell>
                    {teachersForGroup(group.id)
                      .map((t) => t.full_name)
                      .join(', ') || '-'}
                  </TableCell>
                  <TableCell>{(group.session_slot_lengths ?? []).join('+') || '-'}</TableCell>
                  <TableCell>
                    {group.paired_group_id ? (
                      <Badge variant="secondary">{groupLabel(group.paired_group_id)}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(group)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(group)}>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier' : 'Ajouter'} un groupe pedagogique</DialogTitle>
            <DialogDescription>
              Pattern de seances en nombre de creneaux consecutifs separes par des virgules (ex. 2,1,1,1,1).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                required
                placeholder="ex. Francais 3eme 1, Tandem PC/SVT 6eme 1 (PC)..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subject">Matiere</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger id="subject" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(subjects ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pattern">Pattern de seances</Label>
                <Input
                  id="pattern"
                  required
                  placeholder="ex. 2,1,1,1,1"
                  value={sessionPattern}
                  onChange={(e) => setSessionPattern(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paired">
                Groupe lie (tandem PC/SVT ou LV2 simultanee - meme creneau, salle/prof distincts)
              </Label>
              <Select value={pairedGroupId} onValueChange={setPairedGroupId}>
                <SelectTrigger id="paired" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Aucun</SelectItem>
                  {(groups ?? [])
                    .filter((g) => g.id !== editing?.id)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Classes (tronc commun si plusieurs)</Label>
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-input p-3">
                  {(classes ?? []).map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={classIds.includes(c.id)}
                        onCheckedChange={(checked) =>
                          setClassIds((ids) => (checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Enseignant(s)</Label>
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-input p-3">
                  {(teachers ?? []).map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={teacherIds.includes(t.id)}
                        onCheckedChange={(checked) =>
                          setTeacherIds((ids) =>
                            checked ? [...ids, t.id] : ids.filter((id) => id !== t.id),
                          )
                        }
                      />
                      {t.full_name}
                    </label>
                  ))}
                </div>
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
