import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { CyclePlan, Task } from '../types'

const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 }

function groupByPhase(tasks: Task[]): Record<number, Task[]> {
  const grouped: Record<number, Task[]> = {}
  const sorted = [...tasks].sort(
    (a, b) =>
      (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0) ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  for (const task of sorted) {
    const phase = task.phase_number ?? 0
    if (!grouped[phase]) grouped[phase] = []
    grouped[phase].push(task)
  }
  return grouped
}

export function useCyclePlan() {
  const [plan, setPlan] = useState<CyclePlan | null>(null)
  const [tasksByPhase, setTasksByPhase] = useState<Record<number, Task[]>>({})
  const [loading, setLoading] = useState(true)

  // Fetch active plan
  useEffect(() => {
    let cancelled = false
    async function fetchPlan() {
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
    fetchPlan()
    return () => { cancelled = true }
  }, [])

  // Fetch tasks when plan is known
  useEffect(() => {
    if (!plan) { setTasksByPhase({}); return }
    let cancelled = false
    async function fetchTasks() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('cycle_plan_id', plan!.id)
        .order('created_at', { ascending: true })
      if (cancelled) return
      setTasksByPhase(groupByPhase(data ?? []))
    }
    fetchTasks()
    return () => { cancelled = true }
  }, [plan?.id])

  // Realtime for cycle_plans
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

  // Realtime for tasks — no server-side filter (column filters require replica identity FULL)
  // Handle client-side: only refetch if the changed task belongs to our plan
  useEffect(() => {
    if (!plan) return
    const planId = plan.id

    async function refetch() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('cycle_plan_id', planId)
        .order('created_at', { ascending: true })
      if (data) setTasksByPhase(groupByPhase(data))
    }

    const channel = supabase
      .channel(`realtime-cycle-plan-tasks-${planId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          const record = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as Partial<Task>
          if (record?.cycle_plan_id === planId) refetch()
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [plan?.id])

  const allTasks = Object.values(tasksByPhase).flat()
  const doneTasks = allTasks.filter(t => t.status === 'done' || t.is_completed).length
  const progress = allTasks.length > 0 ? Math.round(doneTasks / allTasks.length * 100) : 0

  return { plan, tasksByPhase, loading, progress, doneTasks, totalTasks: allTasks.length }
}
