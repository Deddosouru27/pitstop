import { useState, useEffect, useCallback } from 'react'
import { Bot, RefreshCw, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionLog {
  id: string
  agent: string | null
  action: string | null
  status: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowCls(status: string | null, action: string | null): string {
  const s = (status ?? '').toLowerCase()
  const a = (action ?? '').toLowerCase()
  if (s.includes('error') || s.includes('fail') || a.includes('fail')) return 'border-l-2 border-red-500/60 bg-red-900/10'
  if (s === 'reverted' || a.includes('revert')) return 'border-l-2 border-amber-500/60 bg-amber-900/10'
  if (s === 'ok' || s === 'success' || s === 'done' || s === 'complete' || a.includes('complete'))
    return 'border-l-2 border-emerald-500/40 bg-emerald-900/5'
  return 'border-l-2 border-white/5'
}

function statusIcon(status: string | null, action: string | null): string {
  const s = (status ?? '').toLowerCase()
  const a = (action ?? '').toLowerCase()
  if (s.includes('error') || s.includes('fail') || a.includes('fail')) return '❌'
  if (s === 'reverted' || a.includes('revert')) return '↩️'
  if (s === 'ok' || s === 'success' || s === 'done' || s === 'complete' || a.includes('complete')) return '✅'
  if (a.includes('start')) return '🔵'
  return '·'
}

function agentLabel(agent: string | null): string {
  const a = (agent ?? '').toLowerCase()
  if (a.includes('autorun')) return 'autorun'
  if (a.includes('heartbeat')) return 'heartbeat'
  if (a.includes('runner')) return 'runner'
  if (a.includes('intake')) return 'intake'
  return agent ?? '?'
}

function agentCls(agent: string | null): string {
  const a = (agent ?? '').toLowerCase()
  if (a.includes('autorun'))   return 'text-blue-400 bg-blue-900/40'
  if (a.includes('heartbeat')) return 'text-emerald-400 bg-emerald-900/40'
  if (a.includes('runner'))    return 'text-purple-400 bg-purple-900/40'
  if (a.includes('intake'))    return 'text-amber-400 bg-amber-900/40'
  return 'text-slate-400 bg-white/5'
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`
  return `${Math.floor(diff / 86400)}д`
}

// ── Details modal ─────────────────────────────────────────────────────────────

function DetailsModal({ log, onClose }: { log: ActionLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[70dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${agentCls(log.agent)}`}>
              {agentLabel(log.agent)}
            </span>
            <p className="text-slate-200 text-sm font-medium">{log.action}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
          <p className="text-[10px] text-slate-600">
            {new Date(log.created_at).toLocaleString('ru-RU')}
            {log.status && <span> · {log.status}</span>}
          </p>
          {log.details ? (
            <pre className="text-xs text-slate-300 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-slate-600 italic">details отсутствуют</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentMonitorPage() {
  const [lastAutorun, setLastAutorun] = useState<ActionLog | null>(null)
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<ActionLog | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const load = useCallback(async () => {
    const [autorunRes, logsRes, pendingRes] = await Promise.all([
      supabase
        .from('agent_action_log')
        .select('id, agent, action, status, details, created_at')
        .eq('agent', 'autorun')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('agent_action_log')
        .select('id, agent, action, status, details, created_at')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo')
        .ilike('description', '%AUTORUN%'),
    ])
    setLastAutorun((autorunRes.data?.[0] as ActionLog) ?? null)
    setLogs((logsRes.data as ActionLog[]) ?? [])
    setPendingCount(pendingRes.count ?? 0)
    setLoading(false)
    setLastRefresh(Date.now())
  }, [])

  // Initial load
  useEffect(() => { load() }, [load])

  // Auto-refresh every 15 s
  useEffect(() => {
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [load])

  // Autorun status derived from last log
  const autorunRunning = lastAutorun?.action?.toLowerCase().includes('session_start') ||
    (lastAutorun && (Date.now() - new Date(lastAutorun.created_at).getTime()) < 5 * 60 * 1000 &&
      !lastAutorun.action?.toLowerCase().includes('session_end'))

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="flex-1 text-2xl font-bold text-slate-100">Agent Monitor</h1>
          <button
            onClick={load}
            disabled={loading}
            className="text-slate-500 active:text-slate-300 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-0.5">
          обновлено {timeAgo(new Date(lastRefresh).toISOString())} назад · auto 15с
        </p>
      </div>

      <div className="px-4 space-y-3">
        {/* Autorun status card */}
        <div className="bg-white/5 rounded-2xl border border-white/[0.06] px-4 py-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${autorunRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <p className="text-sm font-semibold text-slate-200">
              Autorun:{' '}
              <span className={autorunRunning ? 'text-emerald-400' : 'text-slate-500'}>
                {autorunRunning ? '🟢 RUNNING' : '⚪ IDLE'}
              </span>
            </p>
            {pendingCount > 0 && (
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
                {pendingCount} pending
              </span>
            )}
          </div>
          {lastAutorun && (
            <p className="text-xs text-slate-500 pl-4">
              {lastAutorun.action}
              {' · '}{new Date(lastAutorun.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>

        {/* Log list */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            Загрузка...
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center py-16 space-y-2 text-center">
            <p className="text-3xl">🤖</p>
            <p className="text-sm text-slate-500">Логов пока нет</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
            {logs.map((log, i) => (
              <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-white/10 transition-colors ${rowCls(log.status, log.action)} ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}
              >
                <span className="text-sm shrink-0">{statusIcon(log.status, log.action)}</span>
                <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${agentCls(log.agent)}`}>
                  {agentLabel(log.agent)}
                </span>
                <p className="flex-1 text-xs text-slate-300 truncate">{log.action}</p>
                <span className="shrink-0 text-[10px] text-slate-600 font-mono">{fmt(log.created_at)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLog && (
        <DetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
