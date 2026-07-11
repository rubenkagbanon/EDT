import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { levelsResource, classesResource } from '@/features/setup/resources'
import type { TablesInsert } from '@/types/database.types'

type Row = { name: string; cycle: 'college' | 'lycee'; count: string; naming: 'numeric' | 'letters' }

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function emptyRow(): Row {
  return { name: '', cycle: 'college', count: '1', naming: 'numeric' }
}

function classSuffix(index: number, naming: Row['naming']) {
  if (naming === 'letters' && index <= LETTERS.length) return LETTERS[index - 1]
  return String(index)
}

export default function LevelsClassesStep() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: existingLevels } = levelsResource.useList(establishmentId!, 'order_index')
  const { createManyMutation: createLevels } = levelsResource.useMutations(establishmentId!)
  const { createManyMutation: createClasses } = classesResource.useMutations(establishmentId!)

  const [rows, setRows] = React.useState<Row[]>([emptyRow()])
  const [saving, setSaving] = React.useState(false)

  function addRow() {
    setRows((r) => [...r, emptyRow()])
  }
  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index))
  }
  function updateRow(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.name.trim() && Number(r.count) > 0)
    if (valid.length === 0) {
      toast.error('Ajoutez au moins un niveau avec un nombre de classes.')
      return
    }
    setSaving(true)
    try {
      const startOrder = existingLevels?.length ?? 0
      const newLevels = await createLevels.mutateAsync(
        valid.map((r, i) => ({
          name: r.name.trim(),
          cycle: r.cycle,
          order_index: startOrder + i,
        })) as never,
      )
      // Correspondance par nom (pas par position : un INSERT ... RETURNING en lot ne garantit
      // pas de renvoyer les lignes dans l'ordre de la liste VALUES).
      const levelByName = new Map(newLevels.map((l) => [l.name, l]))
      const classInserts: TablesInsert<'classes'>[] = []
      for (const row of valid) {
        const level = levelByName.get(row.name.trim())
        if (!level) continue
        const count = Number(row.count)
        for (let n = 1; n <= count; n++) {
          classInserts.push({ level_id: level.id, name: `${row.name.trim()} ${classSuffix(n, row.naming)}` })
        }
      }
      await createClasses.mutateAsync(classInserts as never)
      toast.success(`${newLevels.length} niveau(x) et ${classInserts.length} classe(s) crees.`)
      setRows([emptyRow()])
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {existingLevels && existingLevels.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Deja en place : {existingLevels.map((l) => l.name).join(', ')}.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_110px_150px_auto] gap-2">
          <Label className="text-xs text-muted-foreground">Niveau</Label>
          <Label className="text-xs text-muted-foreground">Cycle</Label>
          <Label className="text-xs text-muted-foreground">Nb. classes</Label>
          <Label className="text-xs text-muted-foreground">Nommage</Label>
          <span />
        </div>
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_110px_150px_auto] items-center gap-2">
            <Input
              placeholder="ex. 6eme"
              value={row.name}
              onChange={(e) => updateRow(index, { name: e.target.value })}
            />
            <Select value={row.cycle} onValueChange={(v) => updateRow(index, { cycle: v as Row['cycle'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="lycee">Lycee</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={row.count}
              onChange={(e) => updateRow(index, { count: e.target.value })}
            />
            <Select
              value={row.naming}
              onValueChange={(v) => updateRow(index, { naming: v as Row['naming'] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">1, 2, 3...</SelectItem>
                <SelectItem value="letters">A, B, C...</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={rows.length <= 1}
              onClick={() => removeRow(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-fit">
          <Plus className="size-4" />
          Ajouter un niveau
        </Button>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? 'Enregistrement...' : 'Enregistrer les niveaux et classes'}
      </Button>
    </div>
  )
}
