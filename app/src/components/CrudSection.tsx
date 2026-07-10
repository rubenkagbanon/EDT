import * as React from 'react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EntityForm, type FieldDef } from '@/components/EntityForm'

type Column<Row> = {
  key: string
  label: string
  render: (row: Row) => React.ReactNode
}

export function CrudSection<Row extends { id: string }>({
  title,
  description,
  rows,
  isLoading,
  columns,
  fields,
  emptyValues,
  toFormValues,
  fromFormValues,
  onCreate,
  onUpdate,
  onDelete,
  deleteConfirmLabel,
}: {
  title: string
  description?: string
  rows: Row[] | undefined
  isLoading: boolean
  columns: Column<Row>[]
  fields: FieldDef[]
  emptyValues: Record<string, string>
  toFormValues: (row: Row) => Record<string, string>
  fromFormValues: (values: Record<string, string>) => Record<string, unknown>
  onCreate: (values: Record<string, unknown>) => Promise<unknown>
  onUpdate: (id: string, values: Record<string, unknown>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  deleteConfirmLabel?: (row: Row) => string
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Row | null>(null)
  const [values, setValues] = React.useState<Record<string, string>>(emptyValues)
  const [saving, setSaving] = React.useState(false)

  function openCreate() {
    setEditing(null)
    setValues(emptyValues)
    setDialogOpen(true)
  }

  function openEdit(row: Row) {
    setEditing(row)
    setValues(toFormValues(row))
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missingField = fields.find(
      (field) => field.type === 'select' && field.required && !values[field.name],
    )
    if (missingField) {
      toast.error(`Le champ "${missingField.label}" doit avoir une valeur (verifiez qu'il existe des options disponibles).`)
      return
    }
    setSaving(true)
    try {
      const payload = fromFormValues(values)
      if (editing) {
        await onUpdate(editing.id, payload)
        toast.success('Modification enregistree.')
      } else {
        await onCreate(payload)
        toast.success('Element cree.')
      }
      setDialogOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: Row) {
    const label = deleteConfirmLabel?.(row) ?? 'cet element'
    if (!window.confirm(`Supprimer ${label} ?`)) return
    try {
      await onDelete(row.id)
      toast.success('Element supprime.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
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
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.render(row)}</TableCell>
                  ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier' : 'Ajouter'}</DialogTitle>
            <DialogDescription>{title}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <EntityForm
              fields={fields}
              values={values}
              onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
            />
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
