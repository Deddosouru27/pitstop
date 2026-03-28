import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
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
}

export function useAgentStats() {
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

      const [statsRes, recentRes] = await Promise.all([
        supabase
          .from('agent_jobs')
          .select('id, type, status, result, created_at, updated_at')
          .gte('created_at', since14)
          .order('created_at', { ascending: false }),
        supabase
          .from('agent_jobs')
          .select('id, type, status, result, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const allJobs: AgentJob[] = statsRes.data ?? []
      const recentJobs: AgentJob[] = recentRes.data ?? []

      // ── Success rate за 7 дней ────────────────────────────────────────────
      const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const last7Jobs = allJobs.filter(j => j.created_at >= since7)
      const total7 = last7Jobs.length
      const completed7 = last7Jobs.filter(j => j.status === 'completed').length
      const successRate = total7 > 0 ? Math.round((completed7 / total7) * 100) : 0

      // ── Группировка по дням за 14 дней ────────────────────────────────────
      const dayMap = new Map<string, number>()
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        dayMap.set(key, 0)
      }
      for (const job of allJobs) {
        const key = job.created_at.slice(0, 10)
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
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  return { stats, loading }
}
