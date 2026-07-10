import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function teacherSubjectsQueryKey(establishmentId: string) {
  return ['teacher_subjects', establishmentId] as const
}

export async function listTeacherSubjects(establishmentId: string) {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('teacher_id, subject_id')
    .eq('establishment_id', establishmentId)
  if (error) throw error
  return data ?? []
}

export function useTeacherSubjects(establishmentId: string) {
  return useQuery({
    queryKey: teacherSubjectsQueryKey(establishmentId),
    queryFn: () => listTeacherSubjects(establishmentId),
  })
}

export function useSetTeacherSubjects(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ teacherId, subjectIds }: { teacherId: string; subjectIds: string[] }) => {
      const { error: deleteError } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('teacher_id', teacherId)
      if (deleteError) throw deleteError

      if (subjectIds.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_subjects')
          .insert(subjectIds.map((subject_id) => ({ teacher_id: teacherId, subject_id })))
        if (insertError) throw insertError
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: teacherSubjectsQueryKey(establishmentId) }),
  })
}
