import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { scheduleEntriesResource, timeSlotsResource } from '@/features/setup/resources'
import type { Tables, TablesInsert } from '@/types/database.types'

const DAYS = [
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
]

const KINDS = [
  { value: 'cours', label: 'Cours' },
  { value: 'recreation', label: 'Recreation' },
  { value: 'dejeuner', label: 'Dejeuner' },
  { value: 'banalise', label: 'Banalise' },
]

function kindShortLabel(value: string) {
  if (value === 'cours') return 'Cours'
  if (value === 'recreation') return 'Recre'
  if (value === 'dejeuner') return 'Dej.'
  if (value === 'banalise') return 'Banalise'
  return value
}

type GridRow = { startTime: string; endTime: string; cells: Record<string, string> }

function emptyRow(): GridRow {
  return { startTime: '', endTime: '', cells: {} }
}

function buildInitialRows(existing: Tables<'time_slots'>[]): GridRow[] {
  if (existing.length === 0) return [emptyRow()]
  const byOrder = new Map<number, Tables<'time_slots'>[]>()
  for (const slot of existing) {
    const list = byOrder.get(slot.order_index) ?? []
    list.push(slot)
    byOrder.set(slot.order_index, list)
  }
  const orders = [...byOrder.keys()].sort((a, b) => a - b)
  return orders.map((order) => {
    const slots = byOrder.get(order)!
    const sample = slots[0]
    const cells: Record<string, string> = {}
    for (const s of slots) cells[String(s.day_of_week)] = s.kind
    return { startTime: sample.start_time.slice(0, 5), endTime: sample.end_time.slice(0, 5), cells }
  })
}

export default function TimeSlotsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: existingSlots, isLoading } = timeSlotsResource.useList(establishmentId!, 'order_index')
  const { data: entries } = scheduleEntriesResource.useList(establishmentId!)
  const { createManyMutation, removeManyMutation } = timeSlotsResource.useMutations(establishmentId!)

  const [rows, setRows] = React.useState<GridRow[]>([emptyRow()])
  const [saving, setSaving] = React.useState(false)
  const initialized = React.useRef(false)

  React.useEffect(() => {
    if (initialized.current || !existingSlots) return
    initialized.current = true
    setRows(buildInitialRows(existingSlots))
  }, [existingSlots])

  function addRow() {
    setRows((r) => {
      const last = r[r.length - 1]
      return [...r, { ...emptyRow(), startTime: last?.endTime ?? '' }]
    })
  }
  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index))
  }
  function updateRow(index: number, patch: Partial<Pick<GridRow, 'startTime' | 'endTime'>>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  // Recreation/dejeuner concernent quasi-systematiquement tous les jours a la fois : on
  // propage a toute la ligne pour eviter de re-selectionner colonne par colonne. Cours et
  // banalise restent par jour (ex. mercredi apres-midi different des autres jours).
  const ROW_WIDE_KINDS = new Set(['recreation', 'dejeuner'])

  function setCell(index: number, day: string, kind: string) {
    setRows((r) =>
      r.map((row, i) => {
        if (i !== index) return row
        const cells = { ...row.cells }
        if (ROW_WIDE_KINDS.has(kind)) {
          for (const d of DAYS) cells[d.value] = kind
        } else if (kind === '') {
          delete cells[day]
        } else {
          cells[day] = kind
        }
        return { ...row, cells }
      }),
    )
  }

  async function handleSave() {
    if (rows.some((r) => !r.startTime || !r.endTime)) {
      toast.error("Renseignez l'heure de debut et de fin de chaque ligne.")
      return
    }
    const inserts: TablesInsert<'time_slots'>[] = rows.flatMap((row, i) =>
      DAYS.filter((d) => row.cells[d.value]).map((d) => ({
        day_of_week: Number(d.value),
        order_index: i + 1,
        start_time: row.startTime,
        end_time: row.endTime,
        kind: row.cells[d.value],
      })),
    )
    if (inserts.length === 0) {
      toast.error('Cochez au moins une case pour creer un creneau.')
      return
    }
    if (
      entries &&
      entries.length > 0 &&
      !window.confirm(
        `${entries.length} seance(s) sont deja placees dans la grille actuelle. Remplacer les creneaux peut les decaler ou les rendre incoherentes. Continuer ?`,
      )
    ) {
      return
    }

    setSaving(true)
    try {
      if (existingSlots && existingSlots.length > 0) {
        await removeManyMutation.mutateAsync(existingSlots.map((s) => s.id))
      }
      await createManyMutation.mutateAsync(inserts as never)
      toast.success(`Grille enregistree (${inserts.length} creneau(x)).`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creneaux horaires</CardTitle>
        <CardDescription>
          La grille hebdomadaire de l'etablissement. Une ligne = un creneau horaire (l'ordre suit la
          position de la ligne) ; chaque case indique le type pour ce jour (cours, recreation,
          dejeuner, banalise) ou reste vide s'il n'y a rien ce jour-la.
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
                  <TableHead className="w-14">Ordre</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead>Fin</TableHead>
                  {DAYS.map((d) => (
                    <TableHead key={d.value} className="text-center">
                      {d.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="time"
                        value={row.startTime}
                        onChange={(e) => updateRow(index, { startTime: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="time"
                        value={row.endTime}
                        onChange={(e) => updateRow(index, { endTime: e.target.value })}
                      />
                    </TableCell>
                    {DAYS.map((d) => (
                      <TableCell key={d.value} className="p-1">
                        <Select
                          value={row.cells[d.value] ?? '__none__'}
                          onValueChange={(v) => setCell(index, d.value, v === '__none__' ? '' : v)}
                        >
                          <SelectTrigger className="w-full min-w-24">
                            <SelectValue>
                              {row.cells[d.value] ? kindShortLabel(row.cells[d.value]) : '—'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {KINDS.map((k) => (
                              <SelectItem key={k.value} value={k.value}>
                                {k.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)}>
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
            Ajouter une ligne
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer la grille'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
