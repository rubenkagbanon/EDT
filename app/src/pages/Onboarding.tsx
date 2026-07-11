import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/utils'

import { useAuth } from '@/lib/auth'
import { createEstablishmentAndBootstrapProfile } from '@/features/profile/api'
import { useInvalidateProfile } from '@/features/profile/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SCHOOL_TYPES = [
  { value: 'college', label: 'College' },
  { value: 'lycee', label: 'Lycee' },
  { value: 'college_lycee', label: 'College et lycee (ensemble scolaire)' },
] as const

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const invalidateProfile = useInvalidateProfile()

  const [name, setName] = React.useState('')
  const [schoolType, setSchoolType] = React.useState<(typeof SCHOOL_TYPES)[number]['value']>('college')
  const [fullName, setFullName] = React.useState((user?.user_metadata?.full_name as string) ?? '')
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const establishment = await createEstablishmentAndBootstrapProfile({
        userId: user.id,
        name,
        schoolType,
        fullName,
      })
      await invalidateProfile()
      toast.success('Etablissement cree.')
      navigate(`/app/${establishment.id}/onboarding-wizard`, { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Une erreur est survenue.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Configurer votre etablissement</CardTitle>
          <CardDescription>
            Ces informations pourront etre modifiees plus tard depuis les parametres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Votre nom</Label>
              <Input
                id="full_name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nom de l'etablissement</Label>
              <Input
                id="name"
                required
                placeholder="ex. Groupe Scolaire Vatican 2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="school_type">Type d'etablissement</Label>
              <Select value={schoolType} onValueChange={(v) => setSchoolType(v as typeof schoolType)}>
                <SelectTrigger id="school_type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? 'Creation...' : 'Continuer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
