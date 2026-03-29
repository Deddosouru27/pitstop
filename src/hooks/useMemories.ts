import { useState, useEffect } from 'react'
import { supabaseMemory } from '../lib/supabaseMemory'
import type { Memory } from '../types'

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchMemories() {
      const { data, error: err } = await supabaseMemory
        .from('memories')
        .select('id, content, source, tags, importance, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return
      if (err) {
        setError(err.message)
      } else if (data) {
        setMemories(data)
      }
      setLoading(false)
    }

    fetchMemories()
    return () => { cancelled = true }
  }, [])

  return { memories, loading, error }
}
