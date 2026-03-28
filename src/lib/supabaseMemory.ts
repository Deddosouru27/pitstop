import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_MEMORY_SUPABASE_URL as string
const key = import.meta.env.VITE_MEMORY_SUPABASE_ANON_KEY as string

export const supabaseMemory = createClient(url, key)
