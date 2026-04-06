import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseMemory } from '../lib/supabaseMemory'
import type { AgentJob } from './useAgentJobs'

export interface DayCount {
  date: string   // 'YYYY-MM-DD'
  label: string  // short display label e.g. '29'
  count: number
}

export interface AgentStats {
  successRate: number        // % completed / total за 7 дней
  completedLast7Days: number
  avgDurationSeconds: number
  jobsByDay: DayCount[]      // последние 14 дней
  recentJobs: AgentJob[]     // последние 10 записей (любой статус)
  memoryCount: number | null // кол-во записей в maos-memory (null = env не задан)
}

export function useAgentStats() {
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

      const hasMemoryEnv = !!import.meta.env.VITE_MEMORY_SUPABASE_URL

      const [statsRes, recentRes, memoryRes] = await Promise.all([
        supabase
          .from('agent_jobs')
          .select('id, type, status, project_id, result, created_at, updated_at')
          .gte('created_at', since14)
          .order('created_at', { ascending: false }),
        supabase
          .from('agent_jobs')
          .select('id, type, status, project_id, result, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(10),
        hasMemoryEnv
          ? supabaseMemory.from('memories').select('*', { count: 'exact', head: true })
          : Promise.resolve({ count: null, error: null }),
      ])

      const allJobs: AgentJob[] = statsRes.data ?? []
      const recentJobs: AgentJob[] = recentRes.data ?? []
      const memoryCount: number | null = memoryRes.error ? null : (memoryRes.count ?? null)

      // ── Success rate: done / (done + blocked) за 7 дней ─────────────────
      const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [doneRes, blockedRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'done')
          .gte('updated_at', since7),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'blocked')
          .gte('updated_at', since7),
      ])
      const completed7 = doneRes.count ?? 0
      const blocked7   = blockedRes.count ?? 0
      const successRate =
        completed7 + blocked7 > 0
          ? Math.round((completed7 / (completed7 + blocked7)) * 100)
          : 100

      // ── График активности: задачи done по completed_at за 14 дней ────────
      const doneTasks14Res = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('status', 'done')
        .gte('completed_at', since14)
        .not('completed_at', 'is', null)

      const dayMap = new Map<string, number>()
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        dayMap.set(key, 0)
      }
      for (const t of (doneTasks14Res.data ?? []) as { completed_at: string }[]) {
        const key = t.completed_at.slice(0, 10)
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
      }
      const jobsByDay: DayCount[] = Array.from(dayMap.entries()).map(([date, count]) => ({
        date,
        label: String(new Date(date + 'T12:00:00').getDate()),
        count,
      }))

      // ── Среднее время выполнения ──────────────────────────────────────────
      const completedJobs = allJobs.filter(j => j.status === 'completed')
      const avgDurationSeconds =
        completedJobs.length > 0
          ? Math.round(
              completedJobs.reduce((sum, j) => {
                const ms =
                  new Date(j.updated_at).getTime() - new Date(j.created_at).getTime()
                return sum + ms / 1000
              }, 0) / completedJobs.length,
            )
          : 0

      setStats({
        successRate,
        completedLast7Days: completed7,
        avgDurationSeconds,
        jobsByDay,
        recentJobs,
        memoryCount,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  return { stats, loading }
}
