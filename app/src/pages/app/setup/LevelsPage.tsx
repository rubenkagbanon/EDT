import { useParams } from 'react-router-dom'

import { CrudSection } from '@/components/CrudSection'
import { classesResource, levelsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type Level = Tables<'levels'>
type Class = Tables<'classes'>

const CYCLES = [
  { value: 'college', label: 'College' },
  { value: 'lycee', label: 'Lycee' },
]

function cycleLabel(value: string) {
  return CYCLES.find((c) => c.value === value)?.label ?? value
}

export default function LevelsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: levels, isLoading: levelsLoading } = levelsResource.useList(
    establishmentId!,
    'order_index',
  )
  const levelMutations = levelsResource.useMutations(establishmentId!)

  const { data: classes, isLoading: classesLoading } = classesResource.useList(
    establishmentId!,
    'name',
  )
  const classMutations = classesResource.useMutations(establishmentId!)

  const levelOptions = (levels ?? []).map((l) => ({ value: l.id, label: l.name }))
  function levelName(id: string) {
    return levels?.find((l) => l.id === id)?.name ?? id
  }

  return (
    <div className="flex flex-col gap-6">
      <CrudSection<Level>
        title="Niveaux"
        description="ex. 6eme, 5eme, 4eme, 3eme, 2nde, 1ere."
        rows={levels}
        isLoading={levelsLoading}
        columns={[
          { key: 'name', label: 'Nom', render: (r) => r.name },
          { key: 'cycle', label: 'Cycle', render: (r) => cycleLabel(r.cycle) },
          { key: 'order', label: 'Ordre', render: (r) => r.order_index },
        ]}
        fields={[
          { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'ex. 6eme' },
          { name: 'cycle', label: 'Cycle', type: 'select', required: true, options: CYCLES },
          { name: 'order_index', label: 'Ordre d’affichage', type: 'number', min: 0 },
        ]}
        emptyValues={{ name: '', cycle: 'college', order_index: '0' }}
        toFormValues={(r) => ({
          name: r.name,
          cycle: r.cycle,
          order_index: String(r.order_index),
        })}
        fromFormValues={(v) => ({
          name: v.name,
          cycle: v.cycle,
          order_index: v.order_index ? Number(v.order_index) : 0,
        })}
        onCreate={(values) => levelMutations.createMutation.mutateAsync(values as never)}
        onUpdate={(id, values) =>
          levelMutations.updateMutation.mutateAsync({ id, values: values as never })
        }
        onDelete={(id) => levelMutations.removeMutation.mutateAsync(id)}
        deleteConfirmLabel={(r) => r.name}
      />

      <CrudSection<Class>
        title="Classes"
        description="ex. 6eme 1, 6eme 2, 2nde A..."
        rows={classes}
        isLoading={classesLoading}
        columns={[
          { key: 'name', label: 'Nom', render: (r) => r.name },
          { key: 'level', label: 'Niveau', render: (r) => levelName(r.level_id) },
          { key: 'headcount', label: 'Effectif', render: (r) => r.headcount ?? '-' },
        ]}
        fields={[
          { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'ex. 6eme 1' },
          { name: 'level_id', label: 'Niveau', type: 'select', required: true, options: levelOptions },
          { name: 'headcount', label: 'Effectif', type: 'number', min: 0 },
        ]}
        emptyValues={{ name: '', level_id: levelOptions[0]?.value ?? '', headcount: '' }}
        toFormValues={(r) => ({
          name: r.name,
          level_id: r.level_id,
          headcount: r.headcount != null ? String(r.headcount) : '',
        })}
        fromFormValues={(v) => ({
          name: v.name,
          level_id: v.level_id,
          headcount: v.headcount ? Number(v.headcount) : null,
        })}
        onCreate={(values) => classMutations.createMutation.mutateAsync(values as never)}
        onUpdate={(id, values) =>
          classMutations.updateMutation.mutateAsync({ id, values: values as never })
        }
        onDelete={(id) => classMutations.removeMutation.mutateAsync(id)}
        deleteConfirmLabel={(r) => r.name}
      />
    </div>
  )
}
