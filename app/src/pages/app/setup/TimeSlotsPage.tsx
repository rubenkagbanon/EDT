import { useParams } from 'react-router-dom'

import { CrudSection } from '@/components/CrudSection'
import { timeSlotsResource } from '@/features/setup/resources'
import type { Tables } from '@/types/database.types'

type TimeSlot = Tables<'time_slots'>

const DAYS = [
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
  { value: '6', label: 'Samedi' },
]

const KINDS = [
  { value: 'cours', label: 'Cours' },
  { value: 'recreation', label: 'Recreation' },
  { value: 'dejeuner', label: 'Dejeuner' },
  { value: 'banalise', label: 'Banalise (vie scolaire)' },
]

function dayLabel(value: number) {
  return DAYS.find((d) => d.value === String(value))?.label ?? value
}

function kindLabel(value: string) {
  return KINDS.find((k) => k.value === value)?.label ?? value
}

export default function TimeSlotsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: rows, isLoading } = timeSlotsResource.useList(establishmentId!, 'order_index')
  const { createMutation, updateMutation, removeMutation } = timeSlotsResource.useMutations(
    establishmentId!,
  )

  return (
    <CrudSection<TimeSlot>
      title="Creneaux horaires"
      description="La grille hebdomadaire de l'etablissement : jours, heures, recreations, pauses et demi-journees banalisees."
      rows={rows}
      isLoading={isLoading}
      columns={[
        { key: 'day', label: 'Jour', render: (r) => dayLabel(r.day_of_week) },
        { key: 'start', label: 'Debut', render: (r) => r.start_time.slice(0, 5) },
        { key: 'end', label: 'Fin', render: (r) => r.end_time.slice(0, 5) },
        { key: 'kind', label: 'Type', render: (r) => kindLabel(r.kind) },
        { key: 'order', label: 'Ordre', render: (r) => r.order_index },
      ]}
      fields={[
        { name: 'day_of_week', label: 'Jour', type: 'select', required: true, options: DAYS },
        { name: 'start_time', label: 'Heure de debut', type: 'time', required: true },
        { name: 'end_time', label: 'Heure de fin', type: 'time', required: true },
        { name: 'kind', label: 'Type', type: 'select', required: true, options: KINDS },
        { name: 'order_index', label: 'Ordre dans la journee', type: 'number', required: true, min: 0 },
      ]}
      emptyValues={{ day_of_week: '1', start_time: '', end_time: '', kind: 'cours', order_index: '0' }}
      toFormValues={(r) => ({
        day_of_week: String(r.day_of_week),
        start_time: r.start_time.slice(0, 5),
        end_time: r.end_time.slice(0, 5),
        kind: r.kind,
        order_index: String(r.order_index),
      })}
      fromFormValues={(v) => ({
        day_of_week: Number(v.day_of_week),
        start_time: v.start_time,
        end_time: v.end_time,
        kind: v.kind,
        order_index: Number(v.order_index),
      })}
      onCreate={(values) => createMutation.mutateAsync(values as never)}
      onUpdate={(id, values) => updateMutation.mutateAsync({ id, values: values as never })}
      onDelete={(id) => removeMutation.mutateAsync(id)}
      deleteConfirmLabel={(r) => `${dayLabel(r.day_of_week)} ${r.start_time.slice(0, 5)}`}
    />
  )
}
