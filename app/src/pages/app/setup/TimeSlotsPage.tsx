import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
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
import { timeSlotsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type TimeSlot = Tables<'time_slots'>

type SlotRow = { orderIndex: string; startTime: string; endTime: string }

const DAYS = [
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
  { value: '6', label: 'Samedi' },
]

const KINDS = [
  { value: 'cours', label: 'Cours' },
  { value: 'recreation', label: 'Recreation' },
  { value: 'dejeuner', label: 'Dejeuner' },
  { value: 'banalise', label: 'Banalise (vie scolaire)' },
]

function dayLabel(value: number) {
  return DAYS.find((d) => d.value === String(value))?.label ?? String(value)
}

function kindLabel(value: string) {
  return KINDS.find((k) => k.value === value)?.label ?? value
}

function emptyRow(): SlotRow {
  return { orderIndex: '0', startTime: '', endTime: '' }
}

export default function TimeSlotsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: rows, isLoading } = timeSlotsResource.useList(establishmentId!, 'order_index')
  const { createManyMutation, updateMutation, removeMutation } = timeSlotsResource.useMutations(
    establishmentId!,
  )

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TimeSlot | null>(null)
  const [selectedDays, setSelectedDays] = React.useState<string[]>([])
  const [slotRows, setSlotRows] = React.useState<SlotRow[]>([emptyRow()])
  const [kind, setKind] = React.useState('cours')
  const [saving, setSaving] = React.useState(false)

  function openCreate() {
    setEditing(null)
    setSelectedDays([])
    setSlotRows([emptyRow()])
    setKind('cours')
    setDialogOpen(true)
  }

  function openEdit(row: TimeSlot) {
    setEditing(row)
    setSelectedDays([String(row.day_of_week)])
    setSlotRows([
      {
        orderIndex: String(row.order_index),
        startTime: row.start_time.slice(0, 5),
        endTime: row.end_time.slice(0, 5),
      },
    ])
    setKind(row.kind)
    setDialogOpen(true)
  }

  function toggleDay(day: string, checked: boolean) {
    if (editing) {
      // En edition, un seul jour a la fois (une ligne = un jour).
      setSelectedDays(checked ? [day] : [])
      return
    }
    setSelectedDays((days) => (checked ? [...days, day] : days.filter((d) => d !== day)))
  }

  function addRow() {
    setSlotRows((current) => {
      const last = current[current.length - 1]
      const nextOrder = last?.orderIndex !== '' ? String(Number(last?.orderIndex ?? -1) + 1) : ''
      return [...current, { orderIndex: nextOrder, startTime: last?.endTime ?? '', endTime: '' }]
    })
  }

  function removeRow(index: number) {
    setSlotRows((current) => current.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: keyof SlotRow, value: string) {
    setSlotRows((current) => current.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedDays.length === 0) {
      toast.error('Selectionnez au moins un jour.')
      return
    }
    if (
      slotRows.length === 0 ||
      slotRows.some((r) => r.orderIndex === '' || r.startTime === '' || r.endTime === '')
    ) {
      toast.error('Completez l\'ordre, l\'heure de debut et l\'heure de fin de chaque ligne.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const row = slotRows[0]
        await updateMutation.mutateAsync({
          id: editing.id,
          values: {
            day_of_week: Number(selectedDays[0]),
            order_index: Number(row.orderIndex),
            start_time: row.startTime,
            end_time: row.endTime,
            kind,
          },
        })
        toast.success('Creneau modifie.')
      } else {
        const payload = selectedDays.flatMap((day) =>
          slotRows.map((row) => ({
            day_of_week: Number(day),
            order_index: Number(row.orderIndex),
            start_time: row.startTime,
            end_time: row.endTime,
            kind,
          })),
        )
        await createManyMutation.mutateAsync(payload as never)
        toast.success(payload.length > 1 ? `${payload.length} creneaux crees.` : 'Creneau cree.')
      }
      setDialogOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: TimeSlot) {
    if (!window.confirm(`Supprimer le creneau ${dayLabel(row.day_of_week)} ${row.start_time.slice(0, 5)} ?`))
      return
    try {
      await removeMutation.mutateAsync(row.id)
      toast.success('Creneau supprime.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const previewCount = selectedDays.length * slotRows.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creneaux horaires</CardTitle>
        <CardDescription>
          La grille hebdomadaire de l'etablissement : jours, heures, recreations, pauses et
          demi-journees banalisees. A la creation, ajoutez autant de lignes (ordre/debut/fin) que
          necessaire et selectionnez plusieurs jours : le meme type sera applique a toutes les
          combinaisons en une seule fois.
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
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun element pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jour</TableHead>
                <TableHead>Debut</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ordre</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{dayLabel(row.day_of_week)}</TableCell>
                  <TableCell>{row.start_time.slice(0, 5)}</TableCell>
                  <TableCell>{row.end_time.slice(0, 5)}</TableCell>
                  <TableCell>{kindLabel(row.kind)}</TableCell>
                  <TableCell>{row.order_index}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier' : 'Ajouter'} un creneau</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Une ligne represente un seul jour.'
                : "Cochez un ou plusieurs jours, ajoutez une ligne par creneau (ordre, debut, fin), puis choisissez le type applique a toutes les lignes."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Jour{!editing && 's'}</Label>
              <div className="grid grid-cols-3 gap-2 rounded-md border border-input p-3">
                {DAYS.map((day) => (
                  <label key={day.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={(checked) => toggleDay(day.value, Boolean(checked))}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <Label className="text-xs text-muted-foreground">Ordre dans la journee</Label>
                <Label className="text-xs text-muted-foreground">Heure de debut</Label>
                <Label className="text-xs text-muted-foreground">Heure de fin</Label>
                <span />
              </div>
              {slotRows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    required
                    aria-label="Ordre dans la journee"
                    value={row.orderIndex}
                    onChange={(e) => updateRow(index, 'orderIndex', e.target.value)}
                  />
                  <Input
                    type="time"
                    required
                    aria-label="Heure de debut"
                    value={row.startTime}
                    onChange={(e) => updateRow(index, 'startTime', e.target.value)}
                  />
                  <Input
                    type="time"
                    required
                    aria-label="Heure de fin"
                    value={row.endTime}
                    onChange={(e) => updateRow(index, 'endTime', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={slotRows.length <= 1}
                    onClick={() => removeRow(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {!editing && (
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-fit">
                  <Plus className="size-4" />
                  Ajouter une ligne
                </Button>
              )}
              {!editing && previewCount > 1 && (
                <Badge variant="secondary" className="w-fit">
                  {previewCount} creneaux seront crees ({selectedDays.length} jour(s) x {slotRows.length}{' '}
                  ligne(s))
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Type (applique a toutes les lignes)</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger id="kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
