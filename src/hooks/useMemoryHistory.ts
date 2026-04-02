import { useState, useEffect } from 'react'
import { supabaseMemory } from '../lib/supabaseMemory'
import type { MemoryHistory } from '../types'

export function useMemoryHistory() {
  const [items, setItems] = useState<MemoryHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error: err } = await supabaseMemory
        .from('memory_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return
      if (err) setError(err.message)
      else setItems(data ?? [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { items, loading, error }
}
