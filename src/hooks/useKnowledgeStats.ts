import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function toRouteArr(rt: unknown): string[] {
  if (!rt) return []
  if (Array.isArray(rt)) return rt as string[]
  if (typeof rt === 'string') {
    try { const p = JSON.parse(rt); return Array.isArray(p) ? p : [rt] } catch { return [rt] }
  }
  return []
}

function routedContains(rt: unknown, value: string): boolean {
  return toRouteArr(rt).some(r => r.includes(value))
}

export interface KnowledgeStats {
  total: number
  withEmbedding: number
  hot: number
  archive: number
  lastIngestedAt: string | null
}

export function useKnowledgeStats() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [routedRes, embRes, lastRes] = await Promise.all([
        supabase.from('extracted_knowledge').select('routed_to'),
        supabase.from('extracted_knowledge').select('id', { count: 'exact', head: true }).not('embedding', 'is', null),
        supabase.from('ingested_content').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (cancelled) return

      const items = (routedRes.data ?? []) as Array<{ routed_to: unknown }>
      const total = items.length
      const hot = items.filter(i => routedContains(i.routed_to, 'hot_backlog')).length
      const archive = items.filter(
        i => routedContains(i.routed_to, 'knowledge_base') && !routedContains(i.routed_to, 'hot_backlog')
      ).length

      setStats({
        total,
        withEmbedding: embRes.count ?? 0,
        hot,
        archive,
        lastIngestedAt: lastRes.data?.created_at ?? null,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { stats, loading }
}
