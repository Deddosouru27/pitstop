import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { IngestedContent } from '../types'

export function useIngestedContent() {
  const [items, setItems] = useState<IngestedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('ingested_content')
        .select('*')
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (err) setError(err.message)
      else { setItems(data ?? []); setError(null) }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { items, loading, error }
}
