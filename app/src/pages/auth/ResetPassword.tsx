import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Mot de passe mis a jour.')
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Nouveau mot de passe</CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe pour votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          {authLoading ? (
            <p className="text-sm text-muted-foreground">Verification du lien...</p>
          ) : !user ? (
            <p className="text-sm text-muted-foreground">
              Ce lien de reinitialisation est invalide ou a expire. Redemandez-en un depuis la page
              "Mot de passe oublie".
            </p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-2">
                {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
