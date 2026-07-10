import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/lib/auth'
import { fetchMyProfile } from '@/features/profile/api'

export const profileQueryKey = (userId: string | undefined) => ['profile', userId] as const

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: profileQueryKey(user?.id),
    queryFn: () => fetchMyProfile(user!.id),
    enabled: Boolean(user),
  })
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => queryClient.invalidateQueries({ queryKey: profileQueryKey(user?.id) })
}
