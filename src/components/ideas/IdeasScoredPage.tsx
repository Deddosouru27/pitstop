import { useState, useEffect, useCallback } from 'react'
import { ListTodo, RefreshCw, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface ScoredIdea {
  id: string
  content: string
  summary: string | null
  source_type: string | null
  priority_score: number | null
  relevance_score: number | null
  effort_score: number | null
  impact_score: number | null
  triage_status: string | null
  triaged_at: string | null
  created_at: string
}

type TriageFilter = 'all' | 'approved' | 'review' | 'rejected' | 'untriaged'

// ── Helpers ──────────────────────────────────────────────────────────────────

const TRIAGE_CFG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  approved:  { label: 'Approved',  dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  review:    { label: 'Review',    dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-900/30' },
  rejected:  { label: 'Rejected',  dot: 'bg-red-400',     text: 'text-red-400',     bg: 'bg-red-900/30' },
}

function triageCfg(status: string | null) {
  if (!status) return { label: 'Untriaged', dot: 'bg-slate-500', text: 'text-slate-500', bg: 'bg-slate-800/50' }
  return TRIAGE_CFG[status] ?? { label: status, dot: 'bg-slate-500', text: 'text-slate-500', bg: 'bg-slate-800/50' }
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-slate-600'
  if (score >= 7) return 'text-emerald-400'
  if (score >= 4) return 'text-amber-400'
  return 'text-red-400'
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}с`
  if (diff < 3600) return `${Math.floor(diff / 60)}м`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`
  return `${Math.floor(diff / 86400)}д`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function IdeasScoredPage() {
  const [ideas, setIdeas]       = useState<ScoredIdea[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<TriageFilter>('all')
  const [triaging, setTriaging] = useState(false)
  const [triageMsg, setTriageMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ideas')
      .select('id, content, summary, source_type, priority_score, relevance_score, effort_score, impact_score, triage_status, triaged_at, created_at')
      .order('priority_score', { ascending: false, nullsFirst: false })
      .limit(200)
    setIdeas((data ?? []) as ScoredIdea[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Counts
  const counts = {
    approved:  ideas.filter(i => i.triage_status === 'approved').length,
    review:    ideas.filter(i => i.triage_status === 'review').length,
    rejected:  ideas.filter(i => i.triage_status === 'rejected').length,
    untriaged: ideas.filter(i => !i.triage_status).length,
  }

  // Filtered list
  const filtered = filter === 'all'
    ? ideas
    : filter === 'untriaged'
      ? ideas.filter(i => !i.triage_status)
      : ideas.filter(i => i.triage_status === filter)

  const handleRunTriage = async () => {
    setTriaging(true)
    setTriageMsg(null)
    try {
      const res = await fetch('https://maos-intake.vercel.app/triage-all', { method: 'POST' })
      const json = await res.json().catch(() => ({})) as Record<string, unknown>
      if (!res.ok) {
        setTriageMsg(`Error: ${String(json.error ?? json.message ?? res.status)}`)
      } else {
        const count = json.triaged ?? json.count ?? json.processed ?? '?'
        setTriageMsg(`Triaged: ${count}`)
        await load()
      }
    } catch (err) {
      setTriageMsg(err instanceof Error ? err.message : 'Network error')
    }
    setTriaging(false)
    setTimeout(() => setTriageMsg(null), 5000)
  }

  const FILTERS: { key: TriageFilter; label: string; count?: number; cls: string }[] = [
    { key: 'all',       label: 'All',       cls: 'text-slate-300' },
    { key: 'approved',  label: 'Approved',  count: counts.approved,  cls: 'text-emerald-400' },
    { key: 'review',    label: 'Review',    count: counts.review,    cls: 'text-amber-400' },
    { key: 'rejected',  label: 'Rejected',  count: counts.rejected,  cls: 'text-red-400' },
    { key: 'untriaged', label: 'Untriaged', count: counts.untriaged, cls: 'text-slate-500' },
  ]

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo size={20} className="text-purple-400" strokeWidth={1.75} />
            <h1 className="text-2xl font-bold text-slate-100">Ideas Triage</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors p-1"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-emerald-900/20 border border-emerald-700/20 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{counts.approved}</p>
            <p className="text-[10px] text-emerald-600">approved</p>
          </div>
          <div className="bg-amber-900/20 border border-amber-700/20 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-400">{counts.review}</p>
            <p className="text-[10px] text-amber-600">review</p>
          </div>
          <div className="bg-red-900/20 border border-red-700/20 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-red-400">{counts.rejected}</p>
            <p className="text-[10px] text-red-600">rejected</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-slate-400">{counts.untriaged}</p>
            <p className="text-[10px] text-slate-600">untriaged</p>
          </div>
        </div>

        {/* Run Triage button */}
        <button
          onClick={handleRunTriage}
          disabled={triaging}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border bg-purple-700/30 text-purple-300 border-purple-600/30 hover:bg-purple-700/50 disabled:opacity-50 transition-colors"
        >
          <Zap size={14} />
          {triaging ? 'Triaging...' : 'Run Triage'}
        </button>
        {triageMsg && (
          <p className={`text-xs text-center ${triageMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {triageMsg}
          </p>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                filter === f.key ? `bg-white/10 ${f.cls}` : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <span className="ml-1 opacity-60">({f.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas list */}
      <div className="px-4 space-y-1.5">
        {loading ? (
          <p className="text-sm text-slate-600 text-center py-10">Загрузка...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-10">Нет идей</p>
        ) : filtered.map(idea => {
          const cfg = triageCfg(idea.triage_status)
          return (
            <div
              key={idea.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 space-y-1.5"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-snug line-clamp-2">
                    {idea.summary ?? idea.content}
                  </p>
                </div>
                {/* Priority score */}
                <span className={`shrink-0 text-sm font-bold tabular-nums ${scoreColor(idea.priority_score)}`}>
                  {idea.priority_score != null ? Number(idea.priority_score).toFixed(1) : '—'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Triage badge */}
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
                {/* Source */}
                {idea.source_type && (
                  <span className="text-[10px] text-slate-600">{idea.source_type}</span>
                )}
                {/* Sub-scores */}
                {idea.impact_score != null && (
                  <span className="text-[10px] text-slate-600">imp:{Number(idea.impact_score).toFixed(0)}</span>
                )}
                {idea.effort_score != null && (
                  <span className="text-[10px] text-slate-600">eff:{Number(idea.effort_score).toFixed(0)}</span>
                )}
                {/* Time */}
                <span className="text-[10px] text-slate-700 ml-auto">{timeAgo(idea.created_at)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
