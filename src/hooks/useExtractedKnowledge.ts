import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ExtractedKnowledge } from '../types'

// Explicit select excludes the embedding vector column (can be several KB per row)
const FIELDS = 'id,content,knowledge_type,project_id,immediate_relevance,strategic_relevance,novelty,effort,has_ready_code,routed_to,tags,source_url,source_type,business_value,ingested_content_id,superseded_by,created_at'

export function useExtractedKnowledge() {
  const [items, setItems] = useState<ExtractedKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [mainRes, embRes] = await Promise.all([
        supabase.from('extracted_knowledge').select(FIELDS).order('created_at', { ascending: false }),
        supabase.from('extracted_knowledge').select('id').not('embedding', 'is', null),
      ])

      if (cancelled) return
      if (mainRes.error) {
        setError(mainRes.error.message)
      } else {
        const embIds = new Set((embRes.data ?? []).map(r => r.id))
        setItems((mainRes.data ?? []).map(i => ({ ...i, has_embedding: embIds.has(i.id) })))
        setError(null)
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [refreshKey])

  return { items, loading, error, refresh: () => setRefreshKey(k => k + 1) }
}
