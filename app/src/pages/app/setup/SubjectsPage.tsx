import { useParams } from 'react-router-dom'

import { CrudSection } from '@/components/CrudSection'
import { subjectsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type Subject = Tables<'subjects'>

const GROUPS = [
  { value: 'langues', label: 'Langues (Francais, Anglais, LV2...)' },
  { value: 'sciences', label: 'Sciences (Maths, PC, SVT...)' },
  { value: 'autre', label: 'Autre (HG, EDHC, EPS, Philo...)' },
]

function groupLabel(value: string) {
  return GROUPS.find((g) => g.value === value)?.label ?? value
}

export default function SubjectsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: rows, isLoading } = subjectsResource.useList(establishmentId!, 'code')
  const { createMutation, updateMutation, removeMutation } = subjectsResource.useMutations(
    establishmentId!,
  )

  return (
    <CrudSection<Subject>
      title="Matieres"
      description="Le groupe (langues/sciences/autre) alimente la regle anti-enchainement du moteur de validation."
      rows={rows}
      isLoading={isLoading}
      columns={[
        { key: 'code', label: 'Code', render: (r) => r.code },
        { key: 'name', label: 'Nom', render: (r) => r.name },
        { key: 'group', label: 'Groupe', render: (r) => groupLabel(r.subject_group) },
      ]}
      fields={[
        { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'ex. MATH' },
        { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'ex. Mathematiques' },
        { name: 'subject_group', label: 'Groupe', type: 'select', required: true, options: GROUPS },
      ]}
      emptyValues={{ code: '', name: '', subject_group: 'autre' }}
      toFormValues={(r) => ({ code: r.code, name: r.name, subject_group: r.subject_group })}
      fromFormValues={(v) => ({ code: v.code, name: v.name, subject_group: v.subject_group })}
      onCreate={(values) => createMutation.mutateAsync(values as never)}
      onUpdate={(id, values) => updateMutation.mutateAsync({ id, values: values as never })}
      onDelete={(id) => removeMutation.mutateAsync(id)}
      deleteConfirmLabel={(r) => r.name}
    />
  )
}
