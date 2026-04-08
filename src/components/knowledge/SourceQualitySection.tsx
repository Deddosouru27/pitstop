import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface SourceQualityRow {
  id: string
  domain: string
  avg_score: number | null
  success_rate: number | null
  total_items: number
  last_updated: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return 'text-slate-600'
  if (score >= 7) return 'text-emerald-400'
  if (score >= 4) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBg(score: number | null): string {
  if (score == null) return 'bg-slate-800/50'
  if (score >= 7) return 'bg-emerald-900/20'
  if (score >= 4) return 'bg-amber-900/20'
  return 'bg-red-900/20'
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}м`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`
  return `${Math.floor(diff / 86400)}д`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SourceQualitySection() {
  const [rows, setRows]       = useState<SourceQualityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('source_quality')
      .select('id, domain, avg_score, success_rate, total_items, last_updated')
      .order('avg_score', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (cancelled) return
        setRows((data ?? []) as SourceQualityRow[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return null
  if (rows.length === 0) return null

  return (
    <div className="bg-white/5 rounded-2xl border border-white/[0.06] overflow-hidden">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 pt-4 pb-2">
        🏆 Source Quality
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Domain</th>
            <th className="text-right px-3 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Score</th>
            <th className="text-right px-3 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Success</th>
            <th className="text-right px-3 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Total</th>
            <th className="text-right px-4 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map(row => {
            const score = row.avg_score != null ? Number(row.avg_score) : null
            const rate = row.success_rate != null ? Number(row.success_rate) : null
            return (
              <tr key={row.id} className={`${scoreBg(score)} hover:bg-white/[0.04] transition-colors`}>
                <td className="px-4 py-2.5 text-slate-300 truncate max-w-[140px] font-medium">
                  {row.domain}
                </td>
                <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${scoreColor(score)}`}>
                  {score != null ? score.toFixed(1) : '—'}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${scoreColor(rate != null ? rate / 10 : null)}`}>
                  {rate != null ? `${rate.toFixed(0)}%` : '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">
                  {row.total_items}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600 font-mono">
                  {timeAgo(row.last_updated)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
