import * as React from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  DoorOpen,
  Layers,
  BookOpen,
  Users,
  Table2,
  Link2,
  Clock,
  CalendarRange,
  FileWarning,
  Download,
  LogOut,
  Menu,
  Wand2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/features/profile/hooks'
import { Button } from '@/components/ui/button'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: Array<'admin' | 'scheduler' | 'viewer'>
}

function useNavItems(establishmentId: string): NavItem[] {
  const base = `/app/${establishmentId}`
  return [
    { to: `${base}/dashboard`, label: 'Tableau de bord', icon: LayoutDashboard },
    {
      to: `${base}/onboarding-wizard`,
      label: 'Configuration guidee',
      icon: Wand2,
      roles: ['admin', 'scheduler'],
    },
    { to: `${base}/builder`, label: 'Construction EDT', icon: CalendarRange },
    { to: `${base}/report`, label: "Rapport d'arbitrage", icon: FileWarning },
    { to: `${base}/export`, label: 'Export', icon: Download },
    { to: `${base}/setup/time-slots`, label: 'Creneaux', icon: Clock, roles: ['admin', 'scheduler'] },
    { to: `${base}/setup/rooms`, label: 'Salles', icon: DoorOpen, roles: ['admin', 'scheduler'] },
    { to: `${base}/setup/levels`, label: 'Niveaux & classes', icon: Layers, roles: ['admin', 'scheduler'] },
    { to: `${base}/setup/subjects`, label: 'Matieres', icon: BookOpen, roles: ['admin', 'scheduler'] },
    { to: `${base}/setup/teachers`, label: 'Enseignants', icon: Users, roles: ['admin', 'scheduler'] },
    { to: `${base}/setup/curriculum`, label: 'Volumes horaires', icon: Table2, roles: ['admin', 'scheduler'] },
    { to: `${base}/setup/groups`, label: 'Groupes pedagogiques', icon: Link2, roles: ['admin', 'scheduler'] },
  ]
}

export default function AppLayout() {
  const { establishmentId } = useParams<{ establishmentId: string }>()
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const items = useNavItems(establishmentId!)

  const role = profile?.role ?? 'viewer'
  const visibleItems = items.filter((item) => !item.roles || item.roles.includes(role as never))

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform lg:static lg:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link to={`/app/${establishmentId}/dashboard`} className="font-semibold">
            EDT Manager
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-border p-3">
          <div className="mb-2 truncate text-xs text-muted-foreground">
            {profile?.full_name} - {role}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Deconnexion
          </Button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="flex min-h-svh flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <span className="font-semibold">EDT Manager</span>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
