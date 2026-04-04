import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface KnowledgeStats {
  total: number
  withEmbedding: number
  hot: number
  hotPct: number
  archive: number
  entities: number
  edges: number
  lastIngestedAt: string | null
}

export function useKnowledgeStats() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [totalRes, hotRes, archiveRes, embRes, entityRes, edgeRes, lastRes] = await Promise.all([
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true })
          .filter('routed_to::text', 'ilike', '%hot_backlog%'),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true })
          .filter('routed_to::text', 'ilike', '%knowledge_base%')
          .not('routed_to::text', 'ilike', '%hot_backlog%'),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true })
          .not('embedding', 'is', null),
        supabase.from('entity_nodes').select('*', { count: 'exact', head: true }),
        supabase.from('entity_edges').select('*', { count: 'exact', head: true }),
        supabase.from('ingested_content').select('created_at')
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (cancelled) return

      const total = totalRes.count ?? 0
      const hot   = hotRes.count ?? 0

      setStats({
        total,
        withEmbedding:  embRes.count ?? 0,
        hot,
        hotPct:         total > 0 ? Math.round(hot / total * 1000) / 10 : 0,
        archive:        archiveRes.count ?? 0,
        entities:       entityRes.count ?? 0,
        edges:          edgeRes.count ?? 0,
        lastIngestedAt: lastRes.data?.created_at ?? null,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { stats, loading }
}
