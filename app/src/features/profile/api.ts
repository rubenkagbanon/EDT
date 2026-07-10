import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type Profile = Tables<'profiles'>

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function createEstablishmentAndBootstrapProfile(params: {
  userId: string
  name: string
  schoolType: 'college' | 'lycee' | 'college_lycee'
  fullName: string
}) {
  const { data: establishment, error: establishmentError } = await supabase
    .from('establishments')
    .insert({ name: params.name, school_type: params.schoolType, created_by: params.userId })
    .select()
    .single()
  if (establishmentError) throw establishmentError

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ establishment_id: establishment.id, role: 'admin', full_name: params.fullName })
    .eq('id', params.userId)
  if (profileError) throw profileError

  const currentYear = new Date().getFullYear()
  const label =
    new Date().getMonth() >= 6
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`
  const { error: yearError } = await supabase
    .from('academic_years')
    .insert({ establishment_id: establishment.id, label, is_active: true })
  if (yearError) throw yearError

  return establishment
}
