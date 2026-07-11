import { useParams } from 'react-router-dom'

import { CrudSection } from '@/components/CrudSection'
import { levelsResource, curriculumItemsResource, subjectsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type CurriculumItem = Tables<'curriculum_items'>

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

  return (
    <CrudSection<CurriculumItem>
      title="Volumes horaires"
      description="Volume horaire reglementaire par matiere et par niveau, a couvrir exactement pour chaque classe du niveau (feuille 'classes' de la source)."
      rows={rows}
      isLoading={isLoading}
      columns={[
        { key: 'level', label: 'Niveau', render: (r) => levelName(r.level_id) },
        { key: 'subject', label: 'Matiere', render: (r) => subjectLabel(r.subject_id) },
        { key: 'hours', label: 'Vol. horaire/sem.', render: (r) => `${r.weekly_hours} h` },
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
      ]}
      emptyValues={{
        level_id: levelOptions[0]?.value ?? '',
        subject_id: subjectOptions[0]?.value ?? '',
        weekly_hours: '0',
      }}
      toFormValues={(r) => ({
        level_id: r.level_id,
        subject_id: r.subject_id,
        weekly_hours: String(r.weekly_hours),
      })}
      fromFormValues={(v) => ({
        level_id: v.level_id,
        subject_id: v.subject_id,
        weekly_hours: Number(v.weekly_hours) || 0,
      })}
      onCreate={(values) => createMutation.mutateAsync(values as never)}
      onUpdate={(id, values) => updateMutation.mutateAsync({ id, values: values as never })}
      onDelete={(id) => removeMutation.mutateAsync(id)}
      deleteConfirmLabel={(r) => `${levelName(r.level_id)} / ${subjectLabel(r.subject_id)}`}
    />
  )
}
