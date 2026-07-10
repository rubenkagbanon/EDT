import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { useProfile } from '@/features/profile/hooks'
import { arbitrationNotesResource } from '@/features/setup/resources'
import { useViolations } from '@/features/validation/useValidationSummary'
import type { Violation } from '@/lib/constraints'

const RULE_LABELS: Record<string, string> = {
  resource_unicity_room: 'Salle en double reservation',
  resource_unicity_teacher: 'Enseignant en double reservation',
  resource_unicity_class: 'Classe en double reservation',
  teacher_ceiling: 'Plafond horaire depasse',
  max_levels_per_cycle: 'Plus de 3 niveaux par cycle (priorite 1)',
  anti_monopoly: 'Anti-monopole sur un niveau (priorite 2)',
  sequencing_langues: 'Deux matieres langues enchainees',
  sequencing_sciences: 'Deux matieres sciences enchainees',
  sequencing_same_subject_twice: 'Matiere repetee dans la journee',
  sequencing_min_subjects: 'Moins de 3 matieres dans la journee',
  eps_placement: 'EPS mal positionnee',
  gaps_sandwiched: 'Heure creuse encadree',
  paired_group_simultaneity: 'Tandem/LV2 non simultanes',
}

export default function ReportPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const canEdit = profile?.role === 'admin' || profile?.role === 'scheduler'
  const { violations, isLoading } = useViolations(establishmentId!)
  const { data: notes } = arbitrationNotesResource.useList(establishmentId!)
  const { createMutation, removeMutation } = arbitrationNotesResource.useMutations(establishmentId!)

  const [dialogTarget, setDialogTarget] = React.useState<Violation | null>(null)
  const [message, setMessage] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const grouped = React.useMemo(() => {
    const map = new Map<string, Violation[]>()
    for (const v of violations) {
      map.set(v.ruleCode, [...(map.get(v.ruleCode) ?? []), v])
    }
    return [...map.entries()]
  }, [violations])

  function openJustify(violation: Violation) {
    setDialogTarget(violation)
    setMessage(violation.message)
  }

  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!dialogTarget || !user) return
    setSaving(true)
    try {
      await createMutation.mutateAsync({
        rule_code: dialogTarget.ruleCode,
        message,
        schedule_entry_id: dialogTarget.entryIds[0] ?? null,
        created_by: user.id,
      } as never)
      toast.success('Justification enregistree.')
      setDialogTarget(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await removeMutation.mutateAsync(id)
      toast.success('Justification supprimee.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Rapport d'arbitrage</h1>
        <p className="text-sm text-muted-foreground">
          Conflits detectes, tries par ordre d'arbitrage (priorite 1 : niveaux max par cycle, priorite 2 :
          anti-monopole). Justifiez les derogations acceptees en pratique.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Analyse en cours...</p>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Aucune violation detectee sur les seances actuellement placees.
          </CardContent>
        </Card>
      ) : (
        grouped.map(([ruleCode, list]) => (
          <Card key={ruleCode}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {RULE_LABELS[ruleCode] ?? ruleCode}
                <Badge variant={list[0].severity === 'hard' ? 'destructive' : 'warning'}>
                  {list[0].severity === 'hard' ? 'Regle dure' : 'Avertissement'}
                </Badge>
              </CardTitle>
              <CardDescription>{list.length} occurrence(s)</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {list.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-2 text-sm"
                >
                  <span>{v.message}</span>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => openJustify(v)}>
                      Justifier
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader>
          <CardTitle>Justifications enregistrees</CardTitle>
        </CardHeader>
        <CardContent>
          {!notes || notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune justification pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regle</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{RULE_LABELS[note.rule_code] ?? note.rule_code}</TableCell>
                    <TableCell className="max-w-md whitespace-normal">{note.message}</TableCell>
                    <TableCell>{new Date(note.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteNote(note.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(dialogTarget)} onOpenChange={(open) => !open && setDialogTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justifier une derogation</DialogTitle>
            <DialogDescription>
              {dialogTarget && (RULE_LABELS[dialogTarget.ruleCode] ?? dialogTarget.ruleCode)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitNote} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="message">Motif de la derogation</Label>
              <Textarea
                id="message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
