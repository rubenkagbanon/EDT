import { useParams } from 'react-router-dom'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  classesResource,
  roomsResource,
  scheduleEntriesResource,
  teachersResource,
} from '@/features/setup/resources'
import { useValidationSummary } from '@/features/validation/useValidationSummary'

export default function Dashboard() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: classes } = classesResource.useList(establishmentId!)
  const { data: teachers } = teachersResource.useList(establishmentId!)
  const { data: rooms } = roomsResource.useList(establishmentId!)
  const { data: entries } = scheduleEntriesResource.useList(establishmentId!)
  const summary = useValidationSummary(establishmentId!)

  const stats = [
    { label: 'Classes', value: classes?.length ?? '-' },
    { label: 'Enseignants', value: teachers?.length ?? '-' },
    { label: 'Salles', value: rooms?.length ?? '-' },
    { label: 'Seances placees', value: entries?.length ?? '-' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de la construction de l'emploi du temps.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-3xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conflits ouverts</CardTitle>
          <CardDescription>
            {summary.isLoading
              ? 'Analyse en cours...'
              : summary.hardCount === 0
                ? 'Aucune violation dure detectee sur les seances placees.'
                : `${summary.hardCount} violation(s) dure(s) et ${summary.softCount} avertissement(s) a examiner dans le rapport d'arbitrage.`}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
