import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface IdeasHealth {
  total: number
  rejected: number
  hot: number
  convertedToTask: number
  hotRatio: number
}

export interface KnowledgeHealth {
  total: number
  withoutCluster: number
  lowScore: number
}

export interface EntityHealth {
  nodes: number
  edges: number
  orphanNodes: number
}

export interface IngestionHealth {
  lastIngestedAt: string | null
  failedCount: number
  thisWeekCount: number
}

export interface DataQuality {
  ideas: IdeasHealth
  knowledge: KnowledgeHealth
  entity: EntityHealth
  ingestion: IngestionHealth
}

export function useDataQuality() {
  const [data, setData] = useState<DataQuality | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString()

      const [
        ideasAllRes,
        ideasConvertedRes,
        knowledgeTotalRes,
        knowledgeNoClusterRes,
        knowledgeLowScoreRes,
        nodesRes,
        edgesRes,
        ingestionLastRes,
        ingestionFailedRes,
        ingestionWeekRes,
      ] = await Promise.all([
        supabase.from('ideas').select('relevance, status'),
        supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('converted_to_task', true),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }).is('knowledge_type', null),
        supabase.from('extracted_knowledge').select('*', { count: 'exact', head: true }).lt('immediate_relevance', 5),
        supabase.from('entity_nodes').select('*', { count: 'exact', head: true }),
        supabase.from('entity_edges').select('*', { count: 'exact', head: true }),
        supabase.from('ingested_content').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('ingested_content').select('*', { count: 'exact', head: true }).eq('processing_status', 'error'),
        supabase.from('ingested_content').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoStr),
      ])

      if (cancelled) return

      const ideasAll = ideasAllRes.data ?? []
      const total = ideasAll.length
      const rejected = ideasAll.filter(i => i.status === 'dismissed').length
      const hot = ideasAll.filter(i => i.relevance === 'hot').length
      const active = total - rejected
      const hotRatio = active > 0 ? Math.round(hot / active * 100) : 0

      // Orphan nodes: approximate via node count - nodes that appear in edges
      // We can't do a NOT EXISTS in supabase client easily, so we'll fetch edge endpoints and diff
      let orphanNodes = 0
      if ((nodesRes.count ?? 0) > 0) {
        const { data: edgeData } = await supabase
          .from('entity_edges')
          .select('source_id, target_id')
          .limit(5000)
        if (!cancelled && edgeData) {
          const { data: nodeData } = await supabase
            .from('entity_nodes')
            .select('id')
            .limit(5000)
          if (!cancelled && nodeData) {
            const connectedIds = new Set<string>()
            for (const e of edgeData) {
              if (e.source_id) connectedIds.add(e.source_id)
              if (e.target_id) connectedIds.add(e.target_id)
            }
            orphanNodes = nodeData.filter(n => !connectedIds.has(n.id)).length
          }
        }
      }

      if (cancelled) return

      setData({
        ideas: {
          total,
          rejected,
          hot,
          convertedToTask: ideasConvertedRes.count ?? 0,
          hotRatio,
        },
        knowledge: {
          total: knowledgeTotalRes.count ?? 0,
          withoutCluster: knowledgeNoClusterRes.count ?? 0,
          lowScore: knowledgeLowScoreRes.count ?? 0,
        },
        entity: {
          nodes: nodesRes.count ?? 0,
          edges: edgesRes.count ?? 0,
          orphanNodes,
        },
        ingestion: {
          lastIngestedAt: ingestionLastRes.data?.[0]?.created_at ?? null,
          failedCount: ingestionFailedRes.count ?? 0,
          thisWeekCount: ingestionWeekRes.count ?? 0,
        },
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { data, loading }
}
