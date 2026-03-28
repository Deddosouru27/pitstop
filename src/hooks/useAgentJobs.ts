import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface AgentJob {
  id: string
  type: string
  status: string
  result: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function useAgentJobs() {
  const [jobs, setJobs] = useState<AgentJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('agent_jobs')
        .select('id, type, status, result, created_at, updated_at')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(5)
      if (data) setJobs(data)
      setLoading(false)
    }
    fetchJobs()
  }, [])

  return { jobs, loading }
}
