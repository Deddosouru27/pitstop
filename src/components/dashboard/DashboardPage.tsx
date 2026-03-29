import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart2 } from 'lucide-react'
import { useAgentStats } from '../../hooks/useAgentStats'
import { useCyclePlan } from '../../hooks/useCyclePlan'
import type { CyclePlanPhase } from '../../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}с`
  if (seconds < 3600) return `${Math.round(seconds / 60)}м`
  return `${(seconds / 3600).toFixed(1)}ч`
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

// ── Cycle widget ──────────────────────────────────────────────────────────────

const PHASE_ICON: Record<CyclePlanPhase['status'], string> = {
  completed: '✅',
  active:    '🔵',
  pending:   '⬜',
}

function CycleWidget() {
  const { plan, loading } = useCyclePlan()

  if (loading) return null

  if (!plan) {
    return (
      <div className="bg-white/5 rounded-2xl px-4 py-5 border border-white/[0.06] text-center space-y-1">
        <p className="text-sm text-slate-500">Нет активного цикла</p>
        <p className="text-xs text-slate-600">Создай cycle_plan со статусом active</p>
      </div>
    )
  }

  const phases = plan.phases ?? []
  const activePhase = phases.find(p => p.status === 'active')

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-4 border border-white/[0.06] space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        🔄 Текущий цикл: <span className="text-slate-200 normal-case">{plan.name}</span>
      </p>

      {phases.length > 0 && (
        <div className="space-y-2">
          {phases.map(phase => {
            const isActive = phase.status === 'active'
            const isDone = phase.status === 'completed'
            return (
              <div
                key={phase.number}
                className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isActive ? 'bg-purple-600/15 border border-purple-500/30' : 'bg-transparent'
                }`}
              >
                <span className="text-base shrink-0 mt-0.5">{PHASE_ICON[phase.status]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${
                    isDone ? 'line-through text-slate-600' : isActive ? 'text-slate-100' : 'text-slate-500'
                  }`}>
                    Phase {phase.number}: {phase.name}
                    {isActive && (
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse align-middle" />
                    )}
                  </p>
                  {isActive && phase.description && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{phase.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activePhase && (
        <p className="text-[11px] text-slate-600 border-t border-white/[0.06] pt-2">
          Активна: Phase {activePhase.number} · {phases.filter(p => p.status === 'completed').length}/{phases.length} выполнено
        </p>
      )}
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
        <div className="grid grid-cols-2 gap-2">
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
          <StatCard
            label="Память"
            value={stats.memoryCount != null ? String(stats.memoryCount) : '—'}
            sub="записей"
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

        {/* Cycle widget */}
        <CycleWidget />
      </div>
    </div>
  )
}
