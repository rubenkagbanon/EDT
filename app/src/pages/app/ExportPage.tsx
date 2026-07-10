import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEstablishment } from '@/features/setup/useEstablishment'
import { useScheduleContext } from '@/features/validation/useScheduleContext'
import { buildAndDownloadWorkbook } from '@/features/export/buildWorkbook'
import {
  DAY_LABELS,
  buildGridDays,
  buildGridRows,
  cellContentFor,
  slotAt,
  type ViewMode,
} from '@/features/builder/gridUtils'

export default function ExportPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: establishment } = useEstablishment(establishmentId!)
  const { data: ctx, isLoading } = useScheduleContext(establishmentId!)

  const [view, setView] = React.useState<ViewMode>('class')
  const [entityId, setEntityId] = React.useState<string>('')

  const entityOptions = React.useMemo(() => {
    if (!ctx) return []
    if (view === 'class') return ctx.classes.map((c) => ({ value: c.id, label: c.name }))
    if (view === 'teacher') return ctx.teachers.map((t) => ({ value: t.id, label: t.full_name }))
    return ctx.rooms.map((r) => ({ value: r.id, label: r.name }))
  }, [ctx, view])

  React.useEffect(() => {
    if (entityOptions.length > 0 && !entityOptions.some((o) => o.value === entityId)) {
      setEntityId(entityOptions[0].value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityOptions])

  if (isLoading || !ctx) return <p className="text-sm text-muted-foreground">Chargement...</p>

  const days = buildGridDays(ctx)
  const rows = buildGridRows(ctx)

  function handleExcelExport() {
    if (!ctx) return
    buildAndDownloadWorkbook(ctx, establishment?.name ?? 'etablissement')
    toast.success('Fichier Excel genere.')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-semibold">Export</h1>
          <p className="text-sm text-muted-foreground">
            Export Excel complet (3 feuilles Classes/Profs/Salles) ou impression PDF d'une grille.
          </p>
        </div>
        <Button onClick={handleExcelExport}>
          <Download className="size-4" />
          Exporter en Excel
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 no-print">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="class">Par classe</TabsTrigger>
            <TabsTrigger value="teacher">Par professeur</TabsTrigger>
            <TabsTrigger value="room">Par salle</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={entityId} onValueChange={setEntityId}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimer / PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {establishment?.name} - {entityOptions.find((o) => o.value === entityId)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `100px repeat(${days.length}, minmax(96px, 1fr))` }}
          >
            <div />
            {days.map((day) => (
              <div key={day} className="pb-1 text-center text-xs font-semibold">
                {DAY_LABELS[day]}
              </div>
            ))}
            {rows.map((row) => (
              <React.Fragment key={row.orderIndex}>
                <div className="flex items-center justify-end pr-2 text-xs text-muted-foreground">
                  {row.label}
                </div>
                {days.map((day) => {
                  const slot = slotAt(ctx, day, row.orderIndex)
                  if (!slot) return <div key={day} />
                  if (slot.kind !== 'cours') {
                    return (
                      <div
                        key={day}
                        className="flex h-12 items-center justify-center rounded-md bg-muted text-[11px] text-muted-foreground"
                      >
                        {slot.kind === 'recreation' && 'Recreation'}
                        {slot.kind === 'dejeuner' && 'Dejeuner'}
                        {slot.kind === 'banalise' && 'Vie scolaire'}
                      </div>
                    )
                  }
                  const content = cellContentFor(ctx, view, entityId, day, row.orderIndex)
                  return (
                    <div
                      key={day}
                      className="flex h-12 items-center justify-center rounded-md border border-border px-1 text-center text-xs"
                    >
                      {content?.label ?? ''}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
