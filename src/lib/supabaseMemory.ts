import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_MEMORY_SUPABASE_URL as string
const key = import.meta.env.VITE_MEMORY_SUPABASE_ANON_KEY as string

// Realtime intentionally disabled — maos-memory is a semantic store,
// only REST queries are needed. Prevents WebSocket reconnect loops.
export const supabaseMemory = createClient(url, key, {
  realtime: { timeout: 0 },
})
