import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart2 } from 'lucide-react'
import { useAgentStats } from '../../hooks/useAgentStats'
import type { AgentJob } from '../../hooks/useAgentJobs'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}с`
  if (seconds < 3600) return `${Math.round(seconds / 60)}м`
  return `${(seconds / 3600).toFixed(1)}ч`
}

function jobDuration(job: AgentJob): string {
  const ms = new Date(job.updated_at).getTime() - new Date(job.created_at).getTime()
  return formatDuration(Math.max(0, Math.round(ms / 1000)))
}

function jobLabel(job: AgentJob): string {
  const r = job.result ?? {}
  return (r.task as string) || (r.goal as string) || job.type
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/[0.06] space-y-1">
      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

// ── Custom tooltip for BarChart ───────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c27] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200">
      <p className="font-medium">{label}</p>
      <p className="text-slate-400">{payload[0].value} задач</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { stats, loading } = useAgentStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Loading...
      </div>
    )
  }

  if (!stats) return null

  const maxCount = Math.max(...stats.jobsByDay.map(d => d.count), 1)

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Активность агента</p>
      </div>

      <div className="px-4 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="Success rate"
            value={`${stats.successRate}%`}
            sub="за 7 дней"
          />
          <StatCard
            label="Выполнено"
            value={String(stats.completedLast7Days)}
            sub="за 7 дней"
          />
          <StatCard
            label="Среднее"
            value={stats.avgDurationSeconds > 0 ? formatDuration(stats.avgDurationSeconds) : '—'}
            sub="на задачу"
          />
        </div>

        {/* Bar chart */}
        <div className="bg-white/5 rounded-2xl px-4 pt-4 pb-2 border border-white/[0.06]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Активность за 14 дней
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats.jobsByDay} barCategoryGap="30%">
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide allowDecimals={false} domain={[0, maxCount + 1]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.jobsByDay.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.count > 0 ? '#7c3aed' : '#1e1e2e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent jobs */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Последние задачи
          </p>

          {stats.recentJobs.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">
              Бот ещё не выполнял задачи
            </p>
          ) : (
            <div className="space-y-1.5">
              {stats.recentJobs.map(job => (
                <div
                  key={job.id}
                  className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06] flex items-start gap-3"
                >
                  <span className="text-sm mt-0.5 shrink-0">
                    {job.status === 'completed' ? '✅' : '❌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug truncate">
                      {jobLabel(job)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{job.type}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs text-slate-400">{jobDuration(job)}</p>
                    <p className="text-xs text-slate-600">{shortDate(job.updated_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
