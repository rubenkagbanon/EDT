import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { createEntityResource } from '@/lib/entity-crud'

export const teacherUnavailabilityResource = createEntityResource('teacher_unavailability')

function teacherUnavailabilityForTeacherKey(teacherId: string) {
  return ['teacher_unavailability_for_teacher', teacherId] as const
}

export async function listUnavailabilityForTeacher(teacherId: string) {
  const { data, error } = await supabase
    .from('teacher_unavailability')
    .select('*')
    .eq('teacher_id', teacherId)
  if (error) throw error
  return data ?? []
}

export function useUnavailabilityForTeacher(teacherId: string) {
  return useQuery({
    queryKey: teacherUnavailabilityForTeacherKey(teacherId),
    queryFn: () => listUnavailabilityForTeacher(teacherId),
    enabled: Boolean(teacherId),
  })
}

/** Remplace toutes les indisponibilites d'un enseignant par la liste fournie (jour, ordre). */
export function useSetTeacherUnavailability(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      teacherId,
      slots,
    }: {
      teacherId: string
      slots: { day_of_week: number; order_index: number }[]
    }) => {
      const { error: deleteError } = await supabase
        .from('teacher_unavailability')
        .delete()
        .eq('teacher_id', teacherId)
      if (deleteError) throw deleteError

      if (slots.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_unavailability')
          .insert(slots.map((s) => ({ teacher_id: teacherId, ...s })))
        if (insertError) throw insertError
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: teacherUnavailabilityForTeacherKey(variables.teacherId) })
      queryClient.invalidateQueries({ queryKey: teacherUnavailabilityResource.queryKey(establishmentId) })
      queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId] })
    },
  })
}
