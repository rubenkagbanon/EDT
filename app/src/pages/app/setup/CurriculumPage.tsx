import { useParams } from 'react-router-dom'

import { CrudSection } from '@/components/CrudSection'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { levelsResource, curriculumItemsResource, subjectsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type CurriculumItem = Tables<'curriculum_items'>

const WEEKLY_HOURS_TARGET = 22

export default function CurriculumPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: rows, isLoading } = curriculumItemsResource.useList(establishmentId!)
  const { createMutation, updateMutation, removeMutation } = curriculumItemsResource.useMutations(
    establishmentId!,
  )
  const { data: levels } = levelsResource.useList(establishmentId!, 'order_index')
  const { data: subjects } = subjectsResource.useList(establishmentId!, 'code')

  const levelOptions = (levels ?? []).map((l) => ({ value: l.id, label: l.name }))
  const subjectOptions = (subjects ?? []).map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))

  function levelName(id: string) {
    return levels?.find((l) => l.id === id)?.name ?? id
  }
  function subjectLabel(id: string) {
    const s = subjects?.find((s) => s.id === id)
    return s ? `${s.code} - ${s.name}` : id
  }

  const totalsByLevel = (levels ?? []).map((l) => ({
    level: l,
    total: (rows ?? []).filter((r) => r.level_id === l.id).reduce((sum, r) => sum + r.weekly_hours, 0),
  }))

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Volume horaire hebdomadaire par niveau</CardTitle>
          <CardDescription>
            Chaque niveau doit totaliser exactement {WEEKLY_HOURS_TARGET}h de cours par semaine.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {totalsByLevel.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun niveau configure.</p>
          ) : (
            totalsByLevel.map(({ level, total }) => (
              <Badge key={level.id} variant={total === WEEKLY_HOURS_TARGET ? 'secondary' : 'destructive'}>
                {level.name} : {total}h{total !== WEEKLY_HOURS_TARGET ? ` (attendu ${WEEKLY_HOURS_TARGET}h)` : ''}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <CrudSection<CurriculumItem>
        title="Volumes horaires"
        description="Volume horaire reglementaire par matiere et par niveau, a couvrir exactement pour chaque classe du niveau (feuille 'classes' de la source)."
        rows={rows}
        isLoading={isLoading}
        columns={[
          { key: 'level', label: 'Niveau', render: (r) => levelName(r.level_id) },
          { key: 'subject', label: 'Matiere', render: (r) => subjectLabel(r.subject_id) },
          { key: 'hours', label: 'Vol. horaire/sem.', render: (r) => `${r.weekly_hours} h` },
          {
            key: 'pattern',
            label: 'Repartition',
            render: (r) => (r.session_pattern && r.session_pattern.length > 0 ? r.session_pattern.join('+') : '—'),
          },
        ]}
        fields={[
          { name: 'level_id', label: 'Niveau', type: 'select', required: true, options: levelOptions },
          { name: 'subject_id', label: 'Matiere', type: 'select', required: true, options: subjectOptions },
          {
            name: 'weekly_hours',
            label: 'Volume horaire hebdomadaire',
            type: 'number',
            required: true,
            min: 0,
            step: 0.5,
          },
          {
            name: 'session_pattern',
            label: 'Repartition en seances (ex: 2+1+1+1)',
            type: 'text',
            placeholder: '2+1+1+1',
          },
        ]}
        emptyValues={{
          level_id: levelOptions[0]?.value ?? '',
          subject_id: subjectOptions[0]?.value ?? '',
          weekly_hours: '0',
          session_pattern: '',
        }}
        toFormValues={(r) => ({
          level_id: r.level_id,
          subject_id: r.subject_id,
          weekly_hours: String(r.weekly_hours),
          session_pattern: r.session_pattern ? r.session_pattern.join('+') : '',
        })}
        fromFormValues={(v) => {
          const weeklyHours = Number(v.weekly_hours) || 0
          const patternRaw = v.session_pattern.trim()
          let sessionPattern: number[] | null = null
          if (patternRaw) {
            sessionPattern = patternRaw
              .split('+')
              .map((s) => Number(s.trim()))
              .filter((n) => n > 0)
            if (sessionPattern.length === 0 || sessionPattern.some((n) => !Number.isInteger(n))) {
              throw new Error('Repartition invalide (ex: 2+1+1+1).')
            }
            const sum = sessionPattern.reduce((a, b) => a + b, 0)
            if (sum !== weeklyHours) {
              throw new Error(
                `La repartition (${sum}h) doit correspondre exactement au volume horaire (${weeklyHours}h).`,
              )
            }
          }
          return {
            level_id: v.level_id,
            subject_id: v.subject_id,
            weekly_hours: weeklyHours,
            session_pattern: sessionPattern,
          }
        }}
        onCreate={(values) => createMutation.mutateAsync(values as never)}
        onUpdate={(id, values) => updateMutation.mutateAsync({ id, values: values as never })}
        onDelete={(id) => removeMutation.mutateAsync(id)}
        deleteConfirmLabel={(r) => `${levelName(r.level_id)} / ${subjectLabel(r.subject_id)}`}
      />
    </div>
  )
}
