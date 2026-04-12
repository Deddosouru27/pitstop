import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_MEMORY_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_MEMORY_SUPABASE_ANON_KEY as string | undefined

export const supabaseMemory: SupabaseClient = url && key
  ? createClient(url, key, { realtime: { timeout: 0 } })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', { realtime: { timeout: 0 } })
