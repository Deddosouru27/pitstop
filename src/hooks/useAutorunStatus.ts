import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type AutorunState = 'running' | 'just_done' | 'idle'

export function useAutorunStatus(): AutorunState {
  const [state, setState] = useState<AutorunState>('idle')

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from('agent_jobs')
        .select('status, updated_at')
        .eq('type', 'autorun')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!data) { setState('idle'); return }

      if (data.status === 'running') {
        setState('running')
      } else if (data.status === 'completed') {
        const ageMs = Date.now() - new Date(data.updated_at).getTime()
        setState(ageMs < 5 * 60 * 1000 ? 'just_done' : 'idle')
      } else {
        setState('idle')
      }
    }

    check()

    // Re-check every 30 seconds
    const interval = setInterval(check, 30_000)

    // Realtime: react to inserts/updates on agent_jobs
    const channel = supabase
      .channel('autorun-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_jobs' }, check)
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  return state
}
