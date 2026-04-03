import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type AgentStatus = 'idle' | 'working' | 'stuck' | 'failed' | 'offline'

export interface Agent {
  id: string
  name: string
  role: string
  capabilities: string[]
  status: AgentStatus
  current_task_id: string | null
  current_task_title: string | null
  last_heartbeat: string | null
  repo: string | null
  created_at: string
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: rows } = await supabase
      .from('agents')
      .select('id, name, role, capabilities, status, current_task_id, last_heartbeat, repo, created_at')
      .order('created_at')

    if (!rows) { setLoading(false); return }

    const taskIds = rows
      .map(r => r.current_task_id as string | null)
      .filter((id): id is string => id != null)

    let taskTitles: Record<string, string> = {}
    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds)
      if (tasks) {
        for (const t of tasks) taskTitles[t.id as string] = t.title as string
      }
    }

    const parsed: Agent[] = rows.map(r => ({
      id: r.id as string,
      name: r.name as string,
      role: r.role as string,
      capabilities: Array.isArray(r.capabilities) ? (r.capabilities as string[]) : [],
      status: (r.status ?? 'offline') as AgentStatus,
      current_task_id: (r.current_task_id as string | null) ?? null,
      current_task_title: r.current_task_id != null ? (taskTitles[r.current_task_id as string] ?? null) : null,
      last_heartbeat: (r.last_heartbeat as string | null) ?? null,
      repo: (r.repo as string | null) ?? null,
      created_at: r.created_at as string,
    }))

    setAgents(parsed)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000)

    const channel = supabase
      .channel('agents-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => load())
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  return { agents, loading }
}
