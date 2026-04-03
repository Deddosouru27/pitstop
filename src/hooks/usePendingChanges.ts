import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface PendingIdea {
  id: string
  content: string
  relevance: string | null
  source_type: string | null
  created_at: string
}

export interface ContextGapTask {
  id: string
  title: string
  missing: string[]
}

export interface StaleAgent {
  name: string
  role: string
  status: string
  last_heartbeat: string | null
}

export interface PendingData {
  ideas: PendingIdea[]
  ideasTotal: number
  contextGapTasks: ContextGapTask[]
  staleAgents: StaleAgent[]
  loading: boolean
}

export function usePendingChanges(): PendingData {
  const [ideas, setIdeas] = useState<PendingIdea[]>([])
  const [ideasTotal, setIdeasTotal] = useState(0)
  const [contextGapTasks, setContextGapTasks] = useState<ContextGapTask[]>([])
  const [staleAgents, setStaleAgents] = useState<StaleAgent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      const [ideasRes, ideasCountRes, tasksRes, agentsRes] = await Promise.all([
        supabase
          .from('ideas')
          .select('id, content, relevance, source_type, created_at')
          .or("status.eq.new,status.is.null")
          .order('relevance', { ascending: true })
          .limit(5),
        supabase
          .from('ideas')
          .select('id', { count: 'exact', head: true })
          .or("status.eq.new,status.is.null"),
        supabase
          .from('tasks')
          .select('id, title, context')
          .eq('status', 'todo')
          .limit(20),
        supabase
          .from('agents')
          .select('name, role, status, last_heartbeat')
          .or(`last_heartbeat.is.null,last_heartbeat.lt.${thirtyMinAgo}`),
      ])

      if (cancelled) return

      // Ideas
      setIdeas((ideasRes.data ?? []) as PendingIdea[])
      setIdeasTotal(ideasCountRes.count ?? 0)

      // Tasks: filter those missing goal / scope / done_criteria in JS
      const gaps: ContextGapTask[] = []
      for (const row of tasksRes.data ?? []) {
        const ctx = (row.context ?? {}) as Record<string, unknown>
        const missing: string[] = []
        if (!ctx.goal)          missing.push('goal')
        if (!ctx.scope)         missing.push('scope')
        if (!ctx.done_criteria) missing.push('done_criteria')
        if (missing.length > 0) {
          gaps.push({ id: row.id as string, title: row.title as string, missing })
        }
      }
      setContextGapTasks(gaps.slice(0, 5))

      // Agents
      setStaleAgents((agentsRes.data ?? []) as StaleAgent[])

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { ideas, ideasTotal, contextGapTasks, staleAgents, loading }
}
