import { useState, useCallback } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface TopDone {
  id: string
  title: string
}

interface WeeklyReportData {
  period: { from: string; to: string }
  tasks: {
    completed_7d: number
    failed_7d: number
    todo_now: number
    backlog: number
  }
  velocity: {
    cycle_name: string
    velocity_per_day: number
    done: number
    total: number
    projected_completion: string
    days_elapsed: number
    projected_days_remaining: number
  }
  knowledge: {
    total: number
    added_7d: number
    avg_score: number
  }
  ideas: {
    total: number
    approved: number
    review: number
    rejected: number
    untriaged: number
  }
  cost_7d: number
  top_done: TopDone[]
  generated_at: string
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WeeklyReportPage() {
  const [data, setData]       = useState<WeeklyReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: result, error: err } = await supabase.rpc('weekly_report')
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    // RPC returns { weekly_report: {...} } or the object directly
    const raw = result as WeeklyReportData | { weekly_report: WeeklyReportData } | null
    if (!raw) { setError('No data'); setLoading(false); return }
    const parsed = 'weekly_report' in (raw as Record<string, unknown>)
      ? (raw as { weekly_report: WeeklyReportData }).weekly_report
      : raw as WeeklyReportData
    setData(parsed)
    setLoading(false)
  }, [])

  // Load on mount
  useState(() => { load() })

  const periodStr = data
    ? `${new Date(data.period.from).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${new Date(data.period.to).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
    : ''

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-purple-400" strokeWidth={1.75} />
            <h1 className="text-2xl font-bold text-slate-100">Weekly Report</h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors p-1"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {periodStr && <p className="text-sm text-slate-500 mt-0.5">{periodStr}</p>}
      </div>

      {error && (
        <p className="px-4 text-sm text-red-400 pb-4">{error}</p>
      )}

      {loading && !data && (
        <p className="text-sm text-slate-600 text-center py-16">Загрузка...</p>
      )}

      {data && (
        <div className="px-4 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Tasks Done"
              value={String(data.tasks.completed_7d)}
              icon="✅"
              color="text-emerald-400"
            />
            <StatCard
              label="Tasks Failed"
              value={String(data.tasks.failed_7d)}
              icon="❌"
              color={data.tasks.failed_7d > 0 ? 'text-red-400' : 'text-slate-500'}
            />
            <StatCard
              label="Velocity"
              value={`${data.velocity.velocity_per_day.toFixed(1)}/д`}
              icon="⚡"
              color="text-purple-400"
              sub={data.velocity.cycle_name}
            />
            <StatCard
              label="Knowledge Added"
              value={String(data.knowledge.added_7d)}
              icon="🧠"
              color="text-blue-400"
              sub={`${data.knowledge.total} total`}
            />
            <StatCard
              label="Ideas"
              value={String(data.ideas.total)}
              icon="💡"
              color="text-amber-400"
              sub={`${data.ideas.approved} approved`}
            />
            <StatCard
              label="Cost"
              value={`$${data.cost_7d.toFixed(2)}`}
              icon="💰"
              color="text-emerald-400"
            />
          </div>

          {/* Pipeline summary */}
          <div className="bg-white/[0.04] rounded-2xl border border-white/[0.06] px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-400">
                Todo: <span className="font-bold text-slate-200">{data.tasks.todo_now}</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-400">
                Backlog: <span className="font-bold text-slate-200">{data.tasks.backlog}</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-400">
                Projected: <span className="font-bold text-emerald-400">
                  {new Date(data.velocity.projected_completion).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              </span>
            </div>
          </div>

          {/* Top completions */}
          {data.top_done.length > 0 && (
            <div className="bg-white/[0.04] rounded-2xl border border-white/[0.06] px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                🏆 Top 10 Completions
              </p>
              <div className="space-y-1.5">
                {data.top_done.slice(0, 10).map((t, i) => (
                  <div key={t.id} className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-600 font-mono shrink-0 w-5 text-right mt-0.5">
                      {i + 1}.
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono shrink-0 mt-0.5">
                      {t.id}
                    </span>
                    <p className="text-xs text-slate-300 leading-snug line-clamp-1">{t.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated at */}
          <p className="text-[10px] text-slate-700 text-center">
            Generated: {new Date(data.generated_at).toLocaleString('ru-RU')}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, sub }: {
  label: string
  value: string
  icon: string
  color: string
  sub?: string
}) {
  return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/[0.06] px-4 py-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
    </div>
  )
}
