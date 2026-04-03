import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface ClusterGap {
  topic_cluster: string
  cnt: number
}

export interface RecentSource {
  id: string
  source_url: string | null
  source_type: string | null
  created_at: string
  knowledge_count: number
}

export interface DiscoveryData {
  gaps: ClusterGap[]
  recentSources: RecentSource[]
  loading: boolean
  error: string | null
}

export function useDiscovery(): DiscoveryData {
  const [gaps, setGaps] = useState<ClusterGap[]>([])
  const [recentSources, setRecentSources] = useState<RecentSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const [gapsRes, sourcesRes] = await Promise.all([
        supabase.rpc('get_cluster_gaps', { limit_count: 8 }).select('*'),
        supabase
          .from('ingested_content')
          .select('id, source_url, source_type, created_at, knowledge_count')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (cancelled) return

      if (gapsRes.error || sourcesRes.error) {
        // RPC may not exist yet — fall back to raw query via ingested_content
        const fallbackGaps = await supabase
          .from('extracted_knowledge')
          .select('topic_cluster')
          .not('topic_cluster', 'is', null)

        if (cancelled) return

        if (fallbackGaps.error) {
          setError(fallbackGaps.error.message)
        } else {
          // Aggregate in JS
          const counts: Record<string, number> = {}
          for (const row of fallbackGaps.data ?? []) {
            const c = row.topic_cluster as string
            counts[c] = (counts[c] ?? 0) + 1
          }
          const sorted = Object.entries(counts)
            .map(([topic_cluster, cnt]) => ({ topic_cluster, cnt }))
            .sort((a, b) => a.cnt - b.cnt)
            .slice(0, 8)
          setGaps(sorted)
          setError(null)
        }
      } else {
        setGaps((gapsRes.data ?? []) as ClusterGap[])
        setError(null)
      }

      if (!cancelled && sourcesRes.data) {
        setRecentSources(
          (sourcesRes.data as RecentSource[]).map(r => ({
            ...r,
            knowledge_count: r.knowledge_count ?? 0,
          }))
        )
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { gaps, recentSources, loading, error }
}
