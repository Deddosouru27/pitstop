import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { CyclePlan } from '../types'

export function useCyclePlan() {
  const [plan, setPlan] = useState<CyclePlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      const { data } = await supabase
        .from('cycle_plans')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      setPlan(data ?? null)
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [])

  useSupabaseRealtime<CyclePlan>(
    { table: 'cycle_plans', channelName: 'realtime-cycle-plans' },
    {
      onInsert: (record) => { if (record.status === 'active') setPlan(record) },
      onUpdate: (record) => {
        if (record.status === 'active') setPlan(record)
        else setPlan(prev => prev?.id === record.id ? null : prev)
      },
      onDelete: (old) => { setPlan(prev => prev?.id === old.id ? null : prev) },
    },
  )

  return { plan, loading }
}
