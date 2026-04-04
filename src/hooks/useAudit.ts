import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface AuditAgent {
  id: string
  name: string
  role: string
  lastHeartbeat: string | null
  minutesSinceHeartbeat: number | null
}

export interface AuditBlocker {
  id: string
  title: string
  status: string
}

export interface AuditData {
  // Planning
  openBlockers: AuditBlocker[]
  staleIdeas: number
  totalIdeas: number

  // System
  todoTasks: number
  autorunReady: number
  knowledgeTotal: number

  // Context
  lastSnapshotAt: string | null
  hoursSinceSnapshot: number | null

  // Agents
  agents: AuditAgent[]

  // Knowledge quality
  noBusinessValueCount: number
  noEntityCount: number
}

export function useAudit() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    const [
      blockersRes,
      staleIdeasRes,
      totalIdeasRes,
      todoRes,
      autorunRes,
      knowledgeRes,
      snapshotRes,
      agentsRes,
      noBusinessRes,
      noEntityRes,
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status')
        .eq('work_type', 'blocker')
        .not('status', 'in', '("done","cancelled")'),
      supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'pending']),
      supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo'),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo')
        .eq('context_readiness', 'agent_ready'),
      supabase
        .from('extracted_knowledge')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('context_snapshots')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('agents')
        .select('id, name, role, last_heartbeat'),
      supabase
        .from('extracted_knowledge')
        .select('*', { count: 'exact', head: true })
        .is('business_value', null),
      supabase
        .from('extracted_knowledge')
        .select('*', { count: 'exact', head: true })
        .is('entities', null),
    ])

    const now = Date.now()

    const lastSnapshotAt = snapshotRes.data?.[0]?.created_at ?? null
    const hoursSinceSnapshot = lastSnapshotAt
      ? Math.round((now - new Date(lastSnapshotAt).getTime()) / 3_600_000)
      : null

    const agents: AuditAgent[] = (agentsRes.data ?? []).map(a => {
      const hb = a.last_heartbeat as string | null
      const minutesSinceHeartbeat = hb
        ? Math.round((now - new Date(hb).getTime()) / 60_000)
        : null
      return {
        id:                    a.id as string,
        name:                  a.name as string,
        role:                  a.role as string,
        lastHeartbeat:         hb,
        minutesSinceHeartbeat,
      }
    })

    setData({
      openBlockers: ((blockersRes.data ?? []) as AuditBlocker[]),
      staleIdeas:   staleIdeasRes.count ?? 0,
      totalIdeas:   totalIdeasRes.count ?? 0,
      todoTasks:    todoRes.count ?? 0,
      autorunReady: autorunRes.count ?? 0,
      knowledgeTotal: knowledgeRes.count ?? 0,
      lastSnapshotAt,
      hoursSinceSnapshot,
      agents,
      noBusinessValueCount: noBusinessRes.count ?? 0,
      noEntityCount:        noEntityRes.count ?? 0,
    })
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  return { data, loading, lastUpdated, refresh: load }
}
