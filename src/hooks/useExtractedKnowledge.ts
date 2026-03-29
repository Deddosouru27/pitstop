import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ExtractedKnowledge } from '../types'

export function useExtractedKnowledge() {
  const [items, setItems] = useState<ExtractedKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('extracted_knowledge')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (err) {
        setError(err.message)
      } else {
        setItems(data ?? [])
        setError(null)
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [refreshKey])

  return { items, loading, error, refresh: () => setRefreshKey(k => k + 1) }
}
