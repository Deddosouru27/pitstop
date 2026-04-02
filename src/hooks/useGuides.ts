import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { IngestedContent } from '../types'

export function useGuides() {
  const [guides, setGuides] = useState<IngestedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: err } = await supabase
        .from('ingested_content')
        .select('id,title,summary,source_url,source_type,raw_text,knowledge_count,processing_status,is_guide,created_at')
        .eq('is_guide', true)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (err) setError(err.message)
      else { setGuides(data ?? []); setError(null) }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { guides, loading, error }
}
