import { useParams } from 'react-router-dom'

import { CrudSection } from '@/components/CrudSection'
import { classesResource, curriculumItemsResource, subjectsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type CurriculumItem = Tables<'curriculum_items'>

export default function CurriculumPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: rows, isLoading } = curriculumItemsResource.useList(establishmentId!)
  const { createMutation, updateMutation, removeMutation } = curriculumItemsResource.useMutations(
    establishmentId!,
  )
  const { data: classes } = classesResource.useList(establishmentId!, 'name')
  const { data: subjects } = subjectsResource.useList(establishmentId!, 'code')

  const classOptions = (classes ?? []).map((c) => ({ value: c.id, label: c.name }))
  const subjectOptions = (subjects ?? []).map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))

  function className(id: string) {
    return classes?.find((c) => c.id === id)?.name ?? id
  }
  function subjectLabel(id: string) {
    const s = subjects?.find((s) => s.id === id)
    return s ? `${s.code} - ${s.name}` : id
  }

  return (
    <CrudSection<CurriculumItem>
      title="Volumes horaires"
      description="Volume horaire reglementaire par matiere et par classe, a couvrir exactement (feuille 'classes' de la source)."
      rows={rows}
      isLoading={isLoading}
      columns={[
        { key: 'class', label: 'Classe', render: (r) => className(r.class_id) },
        { key: 'subject', label: 'Matiere', render: (r) => subjectLabel(r.subject_id) },
        { key: 'hours', label: 'Vol. horaire/sem.', render: (r) => `${r.weekly_hours} h` },
      ]}
      fields={[
        { name: 'class_id', label: 'Classe', type: 'select', required: true, options: classOptions },
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
        class_id: classOptions[0]?.value ?? '',
        subject_id: subjectOptions[0]?.value ?? '',
        weekly_hours: '0',
      }}
      toFormValues={(r) => ({
        class_id: r.class_id,
        subject_id: r.subject_id,
        weekly_hours: String(r.weekly_hours),
      })}
      fromFormValues={(v) => ({
        class_id: v.class_id,
        subject_id: v.subject_id,
        weekly_hours: Number(v.weekly_hours) || 0,
      })}
      onCreate={(values) => createMutation.mutateAsync(values as never)}
      onUpdate={(id, values) => updateMutation.mutateAsync({ id, values: values as never })}
      onDelete={(id) => removeMutation.mutateAsync(id)}
      deleteConfirmLabel={(r) => `${className(r.class_id)} / ${subjectLabel(r.subject_id)}`}
    />
  )
}
