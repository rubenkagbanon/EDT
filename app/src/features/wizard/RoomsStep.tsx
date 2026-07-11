import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { roomsResource } from '@/features/setup/resources'
import type { TablesInsert } from '@/types/database.types'

type RoomType = 'salle_principale' | 'laboratoire' | 'polyvalente' | 'terrain'
type Row = { type: RoomType; count: string; prefix: string }

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'salle_principale', label: 'Salles physiques' },
  { value: 'laboratoire', label: 'Laboratoires' },
  { value: 'polyvalente', label: 'Amphi / salle polyvalente' },
  { value: 'terrain', label: 'Terrain' },
]

function defaultRows(): Row[] {
  return [
    { type: 'salle_principale', count: '12', prefix: 'S' },
    { type: 'laboratoire', count: '2', prefix: 'L' },
    { type: 'polyvalente', count: '1', prefix: 'Amphi' },
    { type: 'terrain', count: '1', prefix: 'Terrain' },
  ]
}

function generateNames(count: number, prefix: string): string[] {
  const trimmed = prefix.trim()
  if (count <= 1) return [trimmed || '1']
  return Array.from({ length: count }, (_, i) => `${trimmed}${i + 1}`)
}

export default function RoomsStep() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: existingRooms } = roomsResource.useList(establishmentId!, 'name')
  const { createManyMutation } = roomsResource.useMutations(establishmentId!)

  const [rows, setRows] = React.useState<Row[]>(defaultRows())
  const [saving, setSaving] = React.useState(false)

  function addRow() {
    setRows((r) => [...r, { type: 'salle_principale', count: '1', prefix: '' }])
  }
  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index))
  }
  function updateRow(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function handleSave() {
    const valid = rows.filter((r) => Number(r.count) > 0 && r.prefix.trim())
    if (valid.length === 0) {
      toast.error('Renseignez au moins un type de salle avec un nombre et un nom.')
      return
    }
    setSaving(true)
    try {
      const inserts: TablesInsert<'rooms'>[] = valid.flatMap((row) =>
        generateNames(Number(row.count), row.prefix).map((name) => ({ name, room_type: row.type })),
      )
      await createManyMutation.mutateAsync(inserts as never)
      toast.success(`${inserts.length} salle(s) creee(s).`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {existingRooms && existingRooms.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Deja en place : {existingRooms.map((r) => r.name).join(', ')}.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_100px_1fr_auto] gap-2">
          <Label className="text-xs text-muted-foreground">Type de local</Label>
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Label className="text-xs text-muted-foreground">Identification (nom / prefixe)</Label>
          <span />
        </div>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_100px_1fr_auto] items-center gap-2">
            <Select value={row.type} onValueChange={(v) => updateRow(index, { type: v as RoomType })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={row.count}
              onChange={(e) => updateRow(index, { count: e.target.value })}
            />
            <Input
              placeholder="ex. S (-> S1, S2...) ou Amphi"
              value={row.prefix}
              onChange={(e) => updateRow(index, { prefix: e.target.value })}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-fit">
          <Plus className="size-4" />
          Ajouter un type de local
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Si le nombre est 1, le nom saisi est utilise tel quel (ex. "Amphi"). Sinon, un numero est
        ajoute automatiquement (ex. "S" -&gt; S1, S2, S3...).
      </p>
      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? 'Enregistrement...' : 'Enregistrer les salles'}
      </Button>
    </div>
  )
}
