import * as React from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPassword() {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Mot de passe oublie</CardTitle>
          <CardDescription>
            Recevez un lien par email pour choisir un nouveau mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Si un compte existe pour cet email, un lien de reinitialisation vient d'etre envoye.
              Verifiez votre boite de reception (et les spams).
            </p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-2">
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Retour a la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
