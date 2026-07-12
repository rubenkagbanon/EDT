import * as React from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { subjectsResource } from '@/features/setup/resources'
import {
  useEstablishmentSettings,
  useUpdateEstablishmentSettings,
} from '@/features/setup/establishmentSettings'

export default function SettingsPage() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: settings, isLoading } = useEstablishmentSettings(establishmentId!)
  const { data: subjects } = subjectsResource.useList(establishmentId!, 'code')
  const updateSettings = useUpdateEstablishmentSettings(establishmentId!)

  const [grilleStricte, setGrilleStricte] = React.useState(true)
  const [etaler, setEtaler] = React.useState(true)
  const [maxMemeMatiereJour, setMaxMemeMatiereJour] = React.useState('2')
  const [lourdesMatin, setLourdesMatin] = React.useState(true)
  const [matieresLourdes, setMatieresLourdes] = React.useState<string[]>([])
  const [respecterIndispos, setRespecterIndispos] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const initialized = React.useRef(false)

  React.useEffect(() => {
    if (initialized.current || !settings) return
    initialized.current = true
    setGrilleStricte(settings.grille_stricte)
    setEtaler(settings.etaler)
    setMaxMemeMatiereJour(String(settings.max_meme_matiere_jour))
    setLourdesMatin(settings.lourdes_matin)
    setMatieresLourdes(settings.matieres_lourdes)
    setRespecterIndispos(settings.respecter_indispos)
  }, [settings])

  function toggleHeavySubject(subjectId: string, checked: boolean) {
    setMatieresLourdes((ids) => (checked ? [...ids, subjectId] : ids.filter((id) => id !== subjectId)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateSettings.mutateAsync({
        grille_stricte: grilleStricte,
        etaler,
        max_meme_matiere_jour: Number(maxMemeMatiereJour) || 1,
        lourdes_matin: lourdesMatin,
        matieres_lourdes: matieresLourdes,
        respecter_indispos: respecterIndispos,
      })
      toast.success('Reglages enregistres.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglages avances</CardTitle>
        <CardDescription>
          Chaque reglage a une valeur par defaut raisonnable. Ils ajustent le moteur de regles
          (Construction EDT, Rapport) et le generateur automatique.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Respecter strictement la grille horaire</Label>
            <p className="text-xs text-muted-foreground">
              Si desactive, tolere un volume horaire non atteint dans le generateur automatique.
            </p>
          </div>
          <Switch checked={grilleStricte} onCheckedChange={setGrilleStricte} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Etaler chaque matiere sur la semaine</Label>
            <p className="text-xs text-muted-foreground">
              Signale une matiere trop repetee le meme jour pour une classe.
            </p>
          </div>
          <Switch checked={etaler} onCheckedChange={setEtaler} />
        </div>

        {etaler && (
          <div className="flex flex-col gap-1.5 pl-4">
            <Label htmlFor="max_meme_matiere">Max d'heures d'une meme matiere par jour</Label>
            <Input
              id="max_meme_matiere"
              type="number"
              min={1}
              max={4}
              className="w-32"
              value={maxMemeMatiereJour}
              onChange={(e) => setMaxMemeMatiereJour(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Placer les matieres lourdes le matin</Label>
            <p className="text-xs text-muted-foreground">
              Signale une matiere lourde placee l'apres-midi.
            </p>
          </div>
          <Switch checked={lourdesMatin} onCheckedChange={setLourdesMatin} />
        </div>

        {lourdesMatin && (
          <div className="flex flex-col gap-1.5 pl-4">
            <Label>Matieres considerees comme lourdes</Label>
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-input p-3">
              {(subjects ?? []).map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={matieresLourdes.includes(s.id)}
                    onCheckedChange={(checked) => toggleHeavySubject(s.id, Boolean(checked))}
                  />
                  {s.code} - {s.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Respecter les indisponibilites des enseignants</Label>
            <p className="text-xs text-muted-foreground">
              Empeche de placer un enseignant sur un creneau qu'il a marque indisponible
              (ecran Enseignants).
            </p>
          </div>
          <Switch checked={respecterIndispos} onCheckedChange={setRespecterIndispos} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-fit">
          {saving ? 'Enregistrement...' : 'Enregistrer les reglages'}
        </Button>
      </CardContent>
    </Card>
  )
}
