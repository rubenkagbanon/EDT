import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function useEstablishment(establishmentId: string) {
  return useQuery({
    queryKey: ['establishment', establishmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', establishmentId)
        .single()
      if (error) throw error
      return data
    },
  })
}
