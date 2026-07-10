import { useParams } from 'react-router-dom'

import { CrudSection } from '@/components/CrudSection'
import { roomsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type Room = Tables<'rooms'>

const ROOM_TYPES = [
  { value: 'salle_principale', label: 'Salle principale' },
  { value: 'laboratoire', label: 'Laboratoire' },
  { value: 'polyvalente', label: 'Polyvalente (amphi)' },
  { value: 'terrain', label: 'Terrain (EPS)' },
  { value: 'autre', label: 'Autre' },
]

function typeLabel(value: string) {
  return ROOM_TYPES.find((t) => t.value === value)?.label ?? value
}

export default function RoomsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: rows, isLoading } = roomsResource.useList(establishmentId!, 'name')
  const { createMutation, updateMutation, removeMutation } = roomsResource.useMutations(
    establishmentId!,
  )

  return (
    <CrudSection<Room>
      title="Salles"
      description="Salles principales, laboratoires, amphi et terrain, avec leur usage prioritaire."
      rows={rows}
      isLoading={isLoading}
      columns={[
        { key: 'name', label: 'Nom', render: (r) => r.name },
        { key: 'type', label: 'Type', render: (r) => typeLabel(r.room_type) },
        { key: 'capacity', label: 'Capacite', render: (r) => r.capacity ?? '-' },
        { key: 'note', label: 'Note', render: (r) => r.priority_note ?? '' },
      ]}
      fields={[
        { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'ex. S1, L1, Amphi' },
        { name: 'room_type', label: 'Type', type: 'select', required: true, options: ROOM_TYPES },
        { name: 'capacity', label: 'Capacite', type: 'number', min: 0 },
        { name: 'priority_note', label: 'Note d’usage prioritaire', type: 'text' },
      ]}
      emptyValues={{ name: '', room_type: 'salle_principale', capacity: '', priority_note: '' }}
      toFormValues={(r) => ({
        name: r.name,
        room_type: r.room_type,
        capacity: r.capacity != null ? String(r.capacity) : '',
        priority_note: r.priority_note ?? '',
      })}
      fromFormValues={(v) => ({
        name: v.name,
        room_type: v.room_type,
        capacity: v.capacity ? Number(v.capacity) : null,
        priority_note: v.priority_note || null,
      })}
      onCreate={(values) => createMutation.mutateAsync(values as never)}
      onUpdate={(id, values) => updateMutation.mutateAsync({ id, values: values as never })}
      onDelete={(id) => removeMutation.mutateAsync(id)}
      deleteConfirmLabel={(r) => r.name}
    />
  )
}
