import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

function classesKey(establishmentId: string) {
  return ['teaching_group_classes', establishmentId] as const
}
function teachersKey(establishmentId: string) {
  return ['teaching_group_teachers', establishmentId] as const
}

export async function listGroupClasses(establishmentId: string) {
  const { data, error } = await supabase
    .from('teaching_group_classes')
    .select('group_id, class_id')
    .eq('establishment_id', establishmentId)
  if (error) throw error
  return data ?? []
}

export async function listGroupTeachers(establishmentId: string) {
  const { data, error } = await supabase
    .from('teaching_group_teachers')
    .select('group_id, teacher_id')
    .eq('establishment_id', establishmentId)
  if (error) throw error
  return data ?? []
}

export function useGroupClasses(establishmentId: string) {
  return useQuery({
    queryKey: classesKey(establishmentId),
    queryFn: () => listGroupClasses(establishmentId),
  })
}

export function useGroupTeachers(establishmentId: string) {
  return useQuery({
    queryKey: teachersKey(establishmentId),
    queryFn: () => listGroupTeachers(establishmentId),
  })
}

export function useSetGroupClasses(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, classIds }: { groupId: string; classIds: string[] }) => {
      const { error: deleteError } = await supabase
        .from('teaching_group_classes')
        .delete()
        .eq('group_id', groupId)
      if (deleteError) throw deleteError
      if (classIds.length > 0) {
        const { error: insertError } = await supabase
          .from('teaching_group_classes')
          .insert(classIds.map((class_id) => ({ group_id: groupId, class_id })))
        if (insertError) throw insertError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classesKey(establishmentId) })
      queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId] })
    },
  })
}

export function useSetGroupTeachers(establishmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, teacherIds }: { groupId: string; teacherIds: string[] }) => {
      const { error: deleteError } = await supabase
        .from('teaching_group_teachers')
        .delete()
        .eq('group_id', groupId)
      if (deleteError) throw deleteError
      if (teacherIds.length > 0) {
        const { error: insertError } = await supabase
          .from('teaching_group_teachers')
          .insert(teacherIds.map((teacher_id) => ({ group_id: groupId, teacher_id })))
        if (insertError) throw insertError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachersKey(establishmentId) })
      queryClient.invalidateQueries({ queryKey: ['schedule-context', establishmentId] })
    },
  })
}
