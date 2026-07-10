import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY manquantes.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
