import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface DayCount { date: string; count: number }
export interface RelevanceStat { label: string; count: number; pct: number }
export interface EntityStats { nodes: number; edges: number; avgConnections: number }
export interface SourceStat { source_type: string; count: number }

export interface StatsData {
  knowledgeByDay: DayCount[]
  relevanceStats: RelevanceStat[]
  entityStats: EntityStats
  ingestionSources: SourceStat[]
}

export function useStatsData() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const since = new Date()
      since.setDate(since.getDate() - 13)
      const sinceStr = since.toISOString().slice(0, 10)

      const [knowledgeRes, hotIdeasRes, strategicIdeasRes, totalIdeasRes, nodesRes, edgesRes, sourcesRes] = await Promise.all([
        supabase
          .from('extracted_knowledge')
          .select('created_at')
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: true })
          .range(0, 4999),
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .eq('relevance', 'hot'),
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .eq('relevance', 'strategic'),
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('entity_nodes')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('entity_edges')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('ingested_content')
          .select('source_type')
          .range(0, 4999),
      ])

      if (cancelled) return

      // 1. Knowledge by day (last 14 days)
      const dayCounts = new Map<string, number>()
      for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (13 - i))
        dayCounts.set(d.toISOString().slice(0, 10), 0)
      }
      for (const row of knowledgeRes.data ?? []) {
        const day = row.created_at.slice(0, 10)
        if (dayCounts.has(day)) dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
      }
      const knowledgeByDay: DayCount[] = Array.from(dayCounts.entries()).map(([date, count]) => ({ date, count }))

      // 2. Relevance stats — use exact counts from DB
      const hot       = hotIdeasRes.count ?? 0
      const strategic = strategicIdeasRes.count ?? 0
      const total     = totalIdeasRes.count ?? 0
      const relevanceStats: RelevanceStat[] = [
        { label: '🔥 Горячие', count: hot, pct: total > 0 ? Math.round(hot / total * 100) : 0 },
        { label: '📐 Стратегические', count: strategic, pct: total > 0 ? Math.round(strategic / total * 100) : 0 },
        { label: '⬜ Обычные', count: total - hot - strategic, pct: total > 0 ? Math.round((total - hot - strategic) / total * 100) : 0 },
      ]

      // 3. Entity stats
      const nodes = nodesRes.count ?? 0
      const edges = edgesRes.count ?? 0
      const avgConnections = nodes > 0 ? Math.round((edges * 2) / nodes * 10) / 10 : 0
      const entityStats: EntityStats = { nodes, edges, avgConnections }

      // 4. Ingestion sources
      const sourceCounts = new Map<string, number>()
      for (const row of sourcesRes.data ?? []) {
        const st = row.source_type ?? 'unknown'
        sourceCounts.set(st, (sourceCounts.get(st) ?? 0) + 1)
      }
      const ingestionSources: SourceStat[] = Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([source_type, count]) => ({ source_type, count }))

      setData({ knowledgeByDay, relevanceStats, entityStats, ingestionSources })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { data, loading }
}
