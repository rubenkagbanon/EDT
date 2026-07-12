import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/database.types'

export function entryClassesQueryKey(establishmentId: string) {
  return ['schedule_entry_classes', establishmentId] as const
}

export async function listEntryClasses(establishmentId: string) {
  const { data, error } = await supabase
    .from('schedule_entry_classes')
    .select('entry_id, class_id')
    .eq('establishment_id', establishmentId)
  if (error) throw error
  return data ?? []
}

export function useEntryClasses(establishmentId: string) {
  return useQuery({
    queryKey: entryClassesQueryKey(establishmentId),
    queryFn: () => listEntryClasses(establishmentId),
  })
}

/** Lie une entree de grille a un ou plusieurs classes (tronc commun si plusieurs). */
export function useLinkEntryClasses(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ entryId, classIds }: { entryId: string; classIds: string[] }) => {
      if (classIds.length === 0) return
      const { error } = await supabase
        .from('schedule_entry_classes')
        .insert(classIds.map((class_id) => ({ entry_id: entryId, class_id })))
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryClassesQueryKey(establishmentId) })
      queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId] })
    },
  })
}

/** Insertion en lot (utilisee par la generation automatique, apres l'insertion des entrees). */
export function useInsertEntryClassesMany(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entryClasses: TablesInsert<'schedule_entry_classes'>[]) => {
      if (entryClasses.length === 0) return
      const { error } = await supabase.from('schedule_entry_classes').insert(entryClasses)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryClassesQueryKey(establishmentId) })
      queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId] })
    },
  })
}
