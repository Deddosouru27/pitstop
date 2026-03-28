import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface AgentJob {
  id: string
  type: string
  status: string
  project_id: string | null
  result: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function useAgentJobs(projectId?: string) {
  const [jobs, setJobs] = useState<AgentJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      let query = supabase
        .from('agent_jobs')
        .select('id, type, status, project_id, result, created_at, updated_at')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data } = await query
      if (data) setJobs(data)
      setLoading(false)
    }

    fetchJobs()
  }, [projectId])

  return { jobs, loading }
}
