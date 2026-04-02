import { useState, useEffect } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionLog {
  id: string
  agent: string | null
  action: string | null
  task_id: string | null
  details: Record<string, unknown> | null
  repo: string | null
  status: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGENT_CFG: Record<string, { label: string; cls: string }> = {
  autorun:   { label: 'autorun',   cls: 'bg-blue-900/50 text-blue-400' },
  heartbeat: { label: 'heartbeat', cls: 'bg-emerald-900/50 text-emerald-400' },
  runner:    { label: 'runner',    cls: 'bg-purple-900/50 text-purple-400' },
  intake:    { label: 'intake',    cls: 'bg-amber-900/50 text-amber-400' },
}

const STATUS_CFG: Record<string, { dot: string }> = {
  success:  { dot: 'bg-emerald-400' },
  complete: { dot: 'bg-emerald-400' },
  done:     { dot: 'bg-emerald-400' },
  failed:   { dot: 'bg-red-400' },
  error:    { dot: 'bg-red-400' },
  running:  { dot: 'bg-amber-400 animate-pulse' },
  started:  { dot: 'bg-amber-400 animate-pulse' },
}

function agentBadge(agent: string | null) {
  const key = (agent ?? '').toLowerCase()
  const cfg = Object.entries(AGENT_CFG).find(([k]) => key.includes(k))
  const { label, cls } = cfg?.[1] ?? { label: agent ?? '?', cls: 'bg-slate-800 text-slate-400' }
  return (
    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function statusDot(status: string | null) {
  const key = (status ?? '').toLowerCase()
  const cfg = STATUS_CFG[key] ?? { dot: 'bg-slate-600' }
  return <span className={`shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />
}

function detailText(details: Record<string, unknown> | null): string | null {
  if (!details) return null
  const candidates = [
    details.commit_message,
    details.message,
    details.error,
    details.task_title,
    details.file,
    details.files,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.slice(0, 120)
    if (Array.isArray(c) && c.length > 0) return c.slice(0, 3).join(', ')
  }
  const str = JSON.stringify(details)
  return str.length > 120 ? str.slice(0, 120) + '…' : str
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return new Date(dateStr).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentLogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('agent_action_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) {
          setLogs((data as ActionLog[]) ?? [])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [refreshKey])

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Agent Logs</h1>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="text-slate-500 active:text-slate-300 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">agent_action_log · последние 50</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          Загрузка...
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center space-y-2">
          <p className="text-3xl">🤖</p>
          <p className="text-sm text-slate-500">Логов пока нет</p>
          <p className="text-xs text-slate-600">agent_action_log пуст</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="px-4 space-y-2">
          {logs.map(log => (
            <div
              key={log.id}
              className="bg-white/5 rounded-2xl border border-white/[0.06] px-4 py-3 space-y-2"
            >
              {/* Row 1: dot + agent badge + action + time */}
              <div className="flex items-center gap-2">
                {statusDot(log.status)}
                {agentBadge(log.agent)}
                <p className="flex-1 text-sm text-slate-200 font-medium truncate">
                  {log.action ?? '—'}
                </p>
                <span className="shrink-0 text-[10px] text-slate-600 whitespace-nowrap">
                  {timeAgo(log.created_at)}
                </span>
              </div>

              {/* Row 2: details */}
              {detailText(log.details) && (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 pl-4">
                  {detailText(log.details)}
                </p>
              )}

              {/* Row 3: repo + status */}
              <div className="flex items-center gap-2 pl-4">
                {log.repo && (
                  <span className="text-[10px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">
                    {log.repo}
                  </span>
                )}
                {log.status && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    log.status.toLowerCase().includes('fail') || log.status.toLowerCase().includes('error')
                      ? 'bg-red-900/40 text-red-400'
                      : log.status.toLowerCase().includes('run') || log.status.toLowerCase().includes('start')
                        ? 'bg-amber-900/40 text-amber-400'
                        : 'bg-emerald-900/40 text-emerald-400'
                  }`}>
                    {log.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
