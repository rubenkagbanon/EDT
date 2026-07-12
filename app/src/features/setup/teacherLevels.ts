import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function teacherLevelsQueryKey(establishmentId: string) {
  return ['teacher_levels', establishmentId] as const
}

export async function listTeacherLevels(establishmentId: string) {
  const { data, error } = await supabase
    .from('teacher_levels')
    .select('teacher_id, level_id')
    .eq('establishment_id', establishmentId)
  if (error) throw error
  return data ?? []
}

export function useTeacherLevels(establishmentId: string) {
  return useQuery({
    queryKey: teacherLevelsQueryKey(establishmentId),
    queryFn: () => listTeacherLevels(establishmentId),
  })
}

export function useSetTeacherLevels(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ teacherId, levelIds }: { teacherId: string; levelIds: string[] }) => {
      const { error: deleteError } = await supabase
        .from('teacher_levels')
        .delete()
        .eq('teacher_id', teacherId)
      if (deleteError) throw deleteError

      if (levelIds.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_levels')
          .insert(levelIds.map((level_id) => ({ teacher_id: teacherId, level_id })))
        if (insertError) throw insertError
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teacherLevelsQueryKey(establishmentId) }),
  })
}
