import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import TimeSlotsPage from '@/pages/app/setup/TimeSlotsPage'
import LevelsClassesStep from '@/features/wizard/LevelsClassesStep'
import RoomsStep from '@/features/wizard/RoomsStep'
import SubjectsStep from '@/features/wizard/SubjectsStep'

const STEPS = [
  { title: 'Jours et horaires', description: 'La grille hebdomadaire de votre etablissement.' },
  { title: 'Classes', description: 'Le nombre de classes par niveau.' },
  { title: 'Salles', description: 'Les locaux disponibles pour les cours.' },
  { title: 'Disciplines', description: 'Les matieres enseignees et leur volume horaire par niveau.' },
]

export default function OnboardingWizard() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const navigate = useNavigate()
  const [step, setStep] = React.useState(0)

  function goToDashboard() {
    navigate(`/app/${establishmentId}/dashboard`, { replace: true })
  }

  function next() {
    if (step === STEPS.length - 1) {
      goToDashboard()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuration de l'etablissement</h1>
        <p className="text-sm text-muted-foreground">
          Ces 4 etapes vous permettent de demarrer rapidement. Vous pouvez les passer et tout
          ajuster ensuite depuis les ecrans Creneaux / Niveaux &amp; classes / Salles / Volumes
          horaires.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className={
              i === step
                ? 'rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                : i < step
                  ? 'rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground'
                  : 'rounded-full border border-input px-3 py-1 text-xs text-muted-foreground'
            }
          >
            {i + 1}. {s.title}
          </div>
        ))}
      </div>

      {step === 0 && <TimeSlotsPage />}
      {step === 1 && <LevelsClassesStep />}
      {step === 2 && <RoomsStep />}
      {step === 3 && <SubjectsStep />}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goToDashboard}>
          Passer pour l'instant
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Precedent
            </Button>
          )}
          <Button onClick={next}>{step === STEPS.length - 1 ? 'Terminer' : 'Suivant'}</Button>
        </div>
      </div>
    </div>
  )
}
