import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CycleVelocityRow {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
  done: number
  total: number
  durationDays: number
  velocity: number   // tasks/day
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shortName(name: string): string {
  // "Cycle 1: Foo Bar Baz" → "C1"
  const m = name.match(/cycle\s*(\d+)/i)
  if (m) return `C${m[1]}`
  return name.slice(0, 4)
}

function daysElapsed(start: string, end: string | null): number {
  const from = new Date(start).getTime()
  const to   = end ? new Date(end).getTime() : Date.now()
  return Math.max(1, Math.round((to - from) / 86_400_000))
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function VelocityTooltip({
  active, payload,
}: { active?: boolean; payload?: { value: number; payload: CycleVelocityRow }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="bg-[#1c1c27] border border-white/10 rounded-xl px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-slate-200">{row.name}</p>
      <p className="text-slate-400">{row.done}/{row.total} задач · {row.durationDays} дн</p>
      <p className="text-purple-300 font-medium">{payload[0].value.toFixed(2)} задач/день</p>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CycleVelocity() {
  const [rows, setRows]     = useState<CycleVelocityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // 1. Fetch all cycle_plans
      const { data: plans } = await supabase
        .from('cycle_plans')
        .select('id, name, status, created_at, updated_at')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: true })

      if (cancelled || !plans || plans.length === 0) {
        setLoading(false)
        return
      }

      // 2. Fetch done + total task counts per plan in parallel
      const enriched = await Promise.all(
        (plans as { id: string; name: string; status: string; created_at: string; updated_at: string }[]).map(async p => {
          const [totalRes, doneRes] = await Promise.all([
            supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('cycle_plan_id', p.id)
              .neq('status', 'cancelled'),
            supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('cycle_plan_id', p.id)
              .eq('status', 'done'),
          ])

          const done  = doneRes.count ?? 0
          const total = totalRes.count ?? 0

          // For active cycles: elapsed from created_at to now
          // For completed: created_at to updated_at
          const endIso = p.status === 'completed' ? p.updated_at : null
          const durationDays = daysElapsed(p.created_at, endIso)
          const velocity = done / durationDays

          return { id: p.id, name: p.name, status: p.status, created_at: p.created_at, updated_at: p.updated_at, done, total, durationDays, velocity }
        })
      )

      if (!cancelled) {
        setRows(enriched)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading || rows.length === 0) return null

  const maxVelocity = Math.max(...rows.map(r => r.velocity), 0.1)

  return (
    <div className="bg-white/5 rounded-2xl px-4 pt-4 pb-3 border border-white/[0.06] space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        ⚡ Cycle Velocity
      </p>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={rows} barCategoryGap="30%">
          <XAxis
            dataKey="name"
            tickFormatter={shortName}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            hide
            allowDecimals
            domain={[0, maxVelocity * 1.2]}
          />
          <Tooltip content={<VelocityTooltip />} cursor={false} />
          <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
            {rows.map(row => (
              <Cell
                key={row.id}
                fill={
                  row.status === 'active'
                    ? '#a855f7'
                    : '#4f4f7a'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="space-y-1.5 border-t border-white/[0.04] pt-2">
        {rows.map(row => (
          <div key={row.id} className="flex items-center gap-2">
            {/* Cycle label */}
            <span className={`text-[10px] font-bold w-6 shrink-0 ${row.status === 'active' ? 'text-purple-400' : 'text-slate-600'}`}>
              {shortName(row.name)}
            </span>

            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${row.status === 'active' ? 'bg-purple-500' : 'bg-slate-600'}`}
                style={{ width: `${row.total > 0 ? Math.round(row.done / row.total * 100) : 0}%` }}
              />
            </div>

            {/* Stats */}
            <span className="text-[10px] text-slate-500 shrink-0 w-14 text-right">
              {row.done}/{row.total}
            </span>
            <span className={`text-[10px] font-semibold shrink-0 w-14 text-right ${row.status === 'active' ? 'text-purple-400' : 'text-slate-500'}`}>
              {row.velocity.toFixed(2)}/д
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-700 text-center">задач в день · пурпурный = активный цикл</p>
    </div>
  )
}
