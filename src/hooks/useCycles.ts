import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { Cycle, CycleStats } from '../types'

export function useCycles(projectId: string) {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchCycles = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabase
          .from('cycles')
          .select('*')
          .eq('project_id', projectId)
          .order('start_date', { ascending: false })

        if (err) throw err
        if (!cancelled) setCycles(data || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCycles()

    return () => { cancelled = true }
  }, [projectId])

  const createCycle = useCallback(async (
    cycle: Omit<Cycle, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Cycle> => {
    const { data, error: err } = await supabase
      .from('cycles')
      .insert([{ ...cycle }])
      .select()
      .single()

    if (err) throw err
    setCycles(prev => [data, ...prev])
    return data
  }, [])

  const updateCycle = useCallback(async (
    id: string,
    updates: Partial<Cycle>
  ): Promise<Cycle> => {
    const { data, error: err } = await supabase
      .from('cycles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    setCycles(prev => prev.map(c => c.id === id ? data : c))
    return data
  }, [])

  const getCycleStats = useCallback(async (cycleId: string): Promise<CycleStats> => {
    const { data, error: err } = await supabase
      .from('tasks')
      .select('status')
      .eq('cycle_id', cycleId)

    if (err) throw err

    const statuses = (data || []).map(t => t.status as string)
    const total = statuses.length
    const done = statuses.filter(s => s === 'done').length

    return {
      total_tasks: total,
      done_tasks: done,
      in_progress: statuses.filter(s => s === 'in_progress').length,
      blocked: statuses.filter(s => s === 'blocked').length,
      completion_rate: total > 0 ? Math.round((done / total) * 100) : 0,
    }
  }, [])

  // ── Realtime subscription (scoped to project) ─────────────────────────────
  const realtimeOptions = useMemo(() => ({
    table: 'cycles',
    filter: `project_id=eq.${projectId}`,
    channelName: `realtime-cycles-${projectId}`,
  }), [projectId])

  useSupabaseRealtime<Cycle>(realtimeOptions, {
    onInsert: (record) => {
      setCycles(prev => {
        if (prev.some(c => c.id === record.id)) return prev
        return [record, ...prev]
      })
    },
    onUpdate: (record) => {
      setCycles(prev => prev.map(c => c.id === record.id ? record : c))
    },
    onDelete: (old) => {
      if (old.id) setCycles(prev => prev.filter(c => c.id !== old.id))
    },
  })

  return { cycles, loading, error, createCycle, updateCycle, getCycleStats }
}
