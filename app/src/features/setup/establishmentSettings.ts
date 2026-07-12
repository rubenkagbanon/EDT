import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database.types'

export function establishmentSettingsQueryKey(establishmentId: string) {
  return ['establishment_settings', establishmentId] as const
}

export async function fetchEstablishmentSettings(
  establishmentId: string,
): Promise<Tables<'establishment_settings'> | null> {
  const { data, error } = await supabase
    .from('establishment_settings')
    .select('*')
    .eq('establishment_id', establishmentId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function useEstablishmentSettings(establishmentId: string) {
  return useQuery({
    queryKey: establishmentSettingsQueryKey(establishmentId),
    queryFn: () => fetchEstablishmentSettings(establishmentId),
  })
}

export function useUpdateEstablishmentSettings(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: TablesUpdate<'establishment_settings'>) => {
      const { data, error } = await supabase
        .from('establishment_settings')
        .update(values)
        .eq('establishment_id', establishmentId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: establishmentSettingsQueryKey(establishmentId) })
      queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId] })
    },
  })
}
