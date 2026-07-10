import { Navigate, Outlet, useParams } from 'react-router-dom'

import { useAuth } from '@/lib/auth'
import { useProfile } from '@/features/profile/hooks'

function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Chargement...
    </div>
  )
}

/** "/" : redirige selon l'etat d'authentification et d'onboarding. */
export function RootRedirect() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()

  if (authLoading || (user && profileLoading)) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.establishment_id) return <Navigate to="/onboarding" replace />
  return <Navigate to={`/app/${profile.establishment_id}/dashboard`} replace />
}

/** Pages publiques (login/signup) : redirige les utilisateurs deja onboardes. */
export function RequireGuest() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()

  if (authLoading || (user && profileLoading)) return <FullPageSpinner />
  if (user && profile?.establishment_id) {
    return <Navigate to={`/app/${profile.establishment_id}/dashboard`} replace />
  }
  if (user && !profile?.establishment_id) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/** Onboarding : exige d'etre connecte mais pas encore rattache a un etablissement. */
export function RequireOnboarding() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()

  if (authLoading || (user && profileLoading)) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.establishment_id) {
    return <Navigate to={`/app/${profile.establishment_id}/dashboard`} replace />
  }
  return <Outlet />
}

/** Espace etablissement : exige d'etre connecte et rattache au bon etablissement. */
export function RequireEstablishment() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { establishmentId } = useParams()

  if (authLoading || (user && profileLoading)) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.establishment_id) return <Navigate to="/onboarding" replace />
  if (profile.establishment_id !== establishmentId) {
    return <Navigate to={`/app/${profile.establishment_id}/dashboard`} replace />
  }
  return <Outlet />
}
